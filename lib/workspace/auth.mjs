import { workspaceDirectory, workspaceAuthMode } from './environment.mjs';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const cookieName = 'hyperspace_session';
const lifetime = 60 * 60 * 24 * 30;
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function sessionSecret() {
  if (process.env.WORKSPACE_SESSION_SECRET) return process.env.WORKSPACE_SESSION_SECRET;
  const directory = workspaceDirectory();
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, 'session-secret');
  try { writeFileSync(file, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return readFileSync(file, 'utf8').trim();
}
export function authenticate(request, options = {}) {
  const mode = options.mode ?? workspaceAuthMode();
  if (mode === 'trusted-proxy') {
    const expected = options.proxySecret ?? process.env.WORKSPACE_PROXY_SECRET;
    const user = request.headers.get('oai-authenticated-user-id');
    if (!expected || !equal(request.headers.get('x-workspace-proxy-secret'), expected) || !user || user.length > 200) throw new Error('Authentication required');
    return { owner: 'proxy:' + user, role: 'Clinician', cookie: null };
  }
  if (!['local', 'demo'].includes(mode) || (mode === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname))) throw new Error('Local practice requires a localhost URL');
  const secret = options.secret ?? sessionSecret();
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  const sign = data => createHmac('sha256', secret).update(data).digest('base64url');
  const raw = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (raw) {
    const [id, expiry, signature, extra] = raw.split('.');
    const expires = Number(expiry);
    if (!extra && /^[a-f0-9-]{36}$/.test(id) && Number.isSafeInteger(expires) && expires > now && expires <= now + lifetime && equal(signature, sign(id + '.' + expiry))) {
      return { owner: 'local:' + id, role: 'Clinician', cookie: null };
    }
  }
  const id = randomUUID(), data = id + '.' + (now + lifetime);
  return { owner: 'local:' + id, role: 'Clinician', cookie: `${cookieName}=${data}.${sign(data)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${lifetime}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` };
}
export function workspaceId(owner) { return createHash('sha256').update(owner).digest('hex').slice(0, 24); }
