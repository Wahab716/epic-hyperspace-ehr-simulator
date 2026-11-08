import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkspaceStore } from '../lib/workspace/store.mjs';
import { createWorkspaceHandlers } from '../lib/workspace/service.mjs';
import { normalizeClinical } from '../public/clinical/workspace-state.mjs';
import { authenticate } from '../lib/workspace/auth.mjs';

const secret = 'test-session-secret-only';
const url = 'http://localhost:3000/api/workspace';
function fixture(t) {
  const store = createWorkspaceStore(':memory:');
  t.after(() => store.close());
  const handlers = createWorkspaceHandlers(store, { secret, mode: 'local' });
  return { store, handlers };
}
async function open(handlers, cookie) {
  const response = await handlers.GET(new Request(url, { headers: cookie ? { cookie } : {} }));
  assert.equal(response.status, 200);
  return { data: await response.json(), cookie: cookie || response.headers.get('set-cookie').split(';')[0] };
}
function post(handlers, cookie, command, origin = 'http://localhost:3000') {
  return handlers.POST(new Request(url, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify(command) }));
}

test('workspace API authenticates a local session and persists a validated chart', async t => {
  const { handlers } = fixture(t);
  const session = await open(handlers);
  const payload = normalizeClinical({ stickies: { '16442684': 'Follow-up task' } });
  const response = await post(handlers, session.cookie, { version: session.data.version, action: 'clinical', payload });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.version, session.data.version + 1);
  assert.equal((await open(handlers, session.cookie)).data.state.clinical.stickies['16442684'], 'Follow-up task');
});

test('different signed sessions cannot read or overwrite each other', async t => {
  const { handlers } = fixture(t);
  const a = await open(handlers), b = await open(handlers);
  assert.notEqual(a.data.workspaceId, b.data.workspaceId);
  await post(handlers, a.cookie, { version: 1, action: 'clinical', payload: { handoff: 'Private practice handoff' } });
  assert.equal((await open(handlers, b.cookie)).data.state.clinical, null);
  const forged = a.cookie.slice(0, -1) + (a.cookie.endsWith('a') ? 'b' : 'a');
  assert.notEqual((await open(handlers, forged)).data.workspaceId, a.data.workspaceId);
});

test('a stale tab gets 409 and cannot overwrite a newer save', async t => {
  const { handlers } = fixture(t);
  const a = await open(handlers), b = await open(handlers, a.cookie);
  const first = await post(handlers, a.cookie, { version: a.data.version, action: 'clinical', payload: { handoff: 'First save' } });
  assert.equal(first.status, 200);
  const stale = await post(handlers, a.cookie, { version: b.data.version, action: 'clinical', payload: { handoff: 'Stale save' } });
  assert.equal(stale.status, 409);
  const current = (await open(handlers, a.cookie)).data;
  assert.equal(current.state.clinical.handoff, 'First save');
  assert.equal(current.version, 2);
});

test('invalid mutations, unknown patients, and role changes leave saved records intact', async t => {
  const { handlers } = fixture(t);
  const session = await open(handlers);
  for (const command of [
    { action: 'role', payload: { role: 'Admin' } },
    { action: 'clinical', payload: null },
    { action: 'clinical', payload: { members: [999] } },
    { action: 'clinical', payload: { orders: [{ mrn: 'missing', name: 'Test', status: 'Active' }] } },
    { action: 'clinical', payload: { notes: 'bad' } },
  ]) {
    assert.equal((await post(handlers, session.cookie, { version: 1, ...command })).status, 400);
    assert.equal((await open(handlers, session.cookie)).data.version, 1);
  }
});

test('origin and JSON validation reject invalid requests', async t => {
  const { handlers } = fixture(t);
  const { cookie } = await open(handlers);
  assert.equal((await post(handlers, cookie, { version: 1, action: 'reset' }, 'https://other.example')).status, 403);
  const bad = new Request(url, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{' });
  assert.equal((await handlers.POST(bad)).status, 400);
  const wrong = new Request(url, { method: 'POST', headers: { cookie }, body: '{}' });
  assert.equal((await handlers.POST(wrong)).status, 415);
});

test('reset is versioned and does not affect another session', async t => {
  const { handlers } = fixture(t);
  const a = await open(handlers), b = await open(handlers);
  await post(handlers, a.cookie, { version: 1, action: 'clinical', payload: { handoff: 'Old work' } });
  const response = await post(handlers, a.cookie, { version: 2, action: 'reset' });
  assert.equal(response.status, 200);
  const current = await response.json();
  assert.equal(current.state.clinical.handoff, '');
  assert.equal(current.version, 3);
  assert.equal((await open(handlers, b.cookie)).data.version, 1);
});

test('database migration and workspace data survive reopening the SQLite file', t => {
  const directory = mkdtempSync(join(tmpdir(), 'hyperspace-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'workspaces.sqlite');
  const first = createWorkspaceStore(file);
  first.load('owner');
  assert.ok(first.save('owner', 1, { clinical: normalizeClinical({ handoff: 'Survives restart' }) }));
  first.close();
  const reopened = createWorkspaceStore(file);
  assert.equal(reopened.load('owner').state.clinical.handoff, 'Survives restart');
  assert.equal(reopened.load('owner').version, 2);
  reopened.close();
});

test('trusted proxy mode requires its secret and rejects untrusted identity headers', () => {
  const request = new Request('https://example.test/api/workspace', { headers: { 'oai-authenticated-user-id': 'user-1' } });
  assert.throws(() => authenticate(request, { mode: 'trusted-proxy', proxySecret: 'expected' }));
  const trusted = new Request(request, { headers: { 'oai-authenticated-user-id': 'user-1', 'x-workspace-proxy-secret': 'expected' } });
  assert.equal(authenticate(trusted, { mode: 'trusted-proxy', proxySecret: 'expected' }).owner, 'proxy:user-1');
  assert.throws(() => authenticate(request, { mode: 'local', secret }));
});

test('two simultaneous writes to one revision produce one winner', async t => {
  const { handlers } = fixture(t);
  const session = await open(handlers);
  const responses = await Promise.all(['One', 'Two'].map(handoff => post(handlers, session.cookie, { version: 1, action: 'clinical', payload: { handoff } })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal((await open(handlers, session.cookie)).data.version, 2);
});
