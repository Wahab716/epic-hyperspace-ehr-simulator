import { hospitalFor, applyWorkflow } from './workflows.mjs';

// The same runner is used by the standalone process and request-time fallback.
// Saves use the workspace version so a worker never overwrites a clinical edit.
export function processWorkspaceJobs(store, owner, now = Date.now()) {
  const row = store.load(owner), s = hospitalFor(row.state);
  const due = s.reportingSchedule?.enabled && Date.parse(s.reportingSchedule.nextRun) <= now;
  if (!due && !s.jobs.some(j => j.status === 'Queued')) return row;
  if (due) {
    if (!s.jobs.some(j => j.status === 'Queued')) s.jobs.push({ id: 'JOB-' + crypto.randomUUID(), type: 'Scheduled reporting load', status: 'Queued', created: new Date(now).toISOString() });
    s.reportingSchedule.nextRun = new Date(now + 3600000).toISOString();
  }
  const role = s.role;
  s.role = 'Reporting Analyst';
  const hospital = applyWorkflow(s, 'processJobs');
  hospital.role = role;
  return store.save(owner, row.version, { ...row.state, hospital }) || store.load(owner);
}
