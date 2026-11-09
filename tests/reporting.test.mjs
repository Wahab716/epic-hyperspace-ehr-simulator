import test from 'node:test';
import assert from 'node:assert/strict';
import { hospitalFor, applyWorkflow } from '../lib/workspace/workflows.mjs';
import { reportingSummary } from '../lib/workspace/reporting.mjs';
import { processWorkspaceJobs } from '../lib/workspace/jobs.mjs';
import { createWorkspaceStore } from '../lib/workspace/store.mjs';
const seed = () => applyWorkflow(hospitalFor({}), 'role', { role: 'Reporting Analyst' });
test('report definitions reconcile a clean load without mutating source', () => {
  const s = seed(), loaded = applyWorkflow(s, 'refresh');
  assert.deepEqual(loaded.patients, s.patients);
  const r = reportingSummary(loaded);
  assert.equal(r.reports.length, 11);
  assert.ok(r.reports.every(x => x.source === x.extract && x.extract === x.cache));
  assert.ok(r.comparisons.every(x => x.matchesSource));
});
for (const failure of ['Partial load','Late result','Changed mapping','Duplicate source','Timezone mismatch','Missing department']) test('reconciliation detects ' + failure, () => {
  let s = seed();
  s.results.push({ id: 'RES-test', value: '1' });
  s = applyWorkflow(s, 'pipelineFailure', { failure });
  s = applyWorkflow(s, 'refresh');
  assert.equal(s.pipeline.status, 'Validation required');
  assert.ok(reportingSummary(s).comparisons.some(x => !x.matchesSource));
});
test('failed extraction retains last good extract and recovery updates cache', () => {
  let s = applyWorkflow(seed(), 'refresh'); const snapshot = structuredClone(s.pipeline.snapshot);
  s = applyWorkflow(s, 'pipelineFailure', { failure: 'Failed extraction' });
  s = applyWorkflow(s, 'queueJob');
  assert.throws(() => applyWorkflow(s, 'queueJob'), /already queued/);
  s = applyWorkflow(s, 'processJobs');
  assert.equal(s.jobs[0].status, 'Failed'); assert.deepEqual(s.pipeline.snapshot, snapshot);
  s = applyWorkflow(s, 'pipelineFailure', { failure: 'None' });
  s = applyWorkflow(applyWorkflow(s, 'queueJob'), 'processJobs');
  assert.equal(s.jobs[1].status, 'Completed');
  assert.ok(s.jobs[1].run);
});
test('stale cache and duplicate grain are visible in reports', () => {
  let s = applyWorkflow(seed(), 'refresh'); const count = s.pipeline.cache.patients.length;
  s.patients.push({ id: 'P-new' });
  s = applyWorkflow(applyWorkflow(s, 'pipelineFailure', { failure: 'Stale cache' }), 'refresh');
  const r = reportingSummary(s).reports.find(x => x.id === 'patients');
  assert.equal(r.cache, count); assert.equal(r.extract, count + 1);
  s = applyWorkflow(applyWorkflow(s, 'pipelineFailure', { failure: 'Duplicate source' }), 'refresh');
  assert.equal(reportingSummary(s).comparisons.find(x => x.table === 'encounters').duplicates, 1);
  assert.equal(reportingSummary(s).reports.find(x => x.id === 'visits').source, reportingSummary(s).reports.find(x => x.id === 'visits').extract);
});
test('unattended runner processes only due sessions, preserves role and runs once', () => {
  const store = createWorkspaceStore(':memory:');
  try {
    let s = applyWorkflow(seed(), 'reportSchedule', { enabled: true });
    s.reportingSchedule.nextRun = new Date(1000).toISOString();
    s.role = 'Nurse';
    store.save('a', store.load('a').version, { hospital: s }); store.load('b');
    const row = processWorkspaceJobs(store, 'a', 2000);
    assert.equal(row.state.hospital.role, 'Nurse');
    assert.equal(row.state.hospital.jobs[0].status, 'Completed');
    assert.equal(processWorkspaceJobs(store, 'a', 2001).version, row.version);
    assert.equal(store.load('b').version, 1);
    assert.deepEqual(store.owners().sort(), ['a','b']);
  } finally { store.close(); }
});
test('background runner does not overwrite concurrent saves', () => {
  const s = applyWorkflow(seed(), 'queueJob');
  const newer = { version: 3, state: { hospital: seed(), marker: 'clinical change' } };
  let count = 0;
  const result = processWorkspaceJobs({ load: () => ++count === 1 ? { version: 1, state: { hospital: s } } : newer, save: () => null }, 'a');
  assert.equal(result, newer);
});
test('schedule and job actions enforce role and schedule payload', () => {
  assert.throws(() => applyWorkflow(seed(), 'reportSchedule', { enabled: 'yes' }), /boolean/);
  const s = applyWorkflow(seed(), 'role', { role: 'Nurse' });
  for (const a of ['queueJob','processJobs','pipelineFailure','reportSchedule']) assert.throws(() => applyWorkflow(s, a, { enabled: true, failure: 'None' }), /role required|not allowed/);
});
