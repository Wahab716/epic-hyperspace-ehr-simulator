import { lessons } from '../training/catalog.mjs';
import { seed } from '../training/domain.mjs';
import { normalizeClinical } from '../../public/clinical/workspace-state.mjs';
const text = (v, label) => { if (typeof v !== 'string' || v.trim().length < 15 || v.length > 12000) throw Error(label + ' requires 15–12,000 characters'); return v.trim(); };
const check = (label, passed, evidence = []) => ({ label, passed: !!passed, evidence });
const ids = rows => rows.map(x => x.id);
export function capstoneAssessment(s) {
  const c = s.capstone;
  if (!c) return { score: 0, max: 100, checks: [], passed: false };
  const encounters = s.encounters.filter(x => x.patient === c.patient && !c.baseline.encounters.includes(x.id));
  const orders = s.orders.filter(x => x.patient === c.patient && encounters.some(e => e.id === x.encounter) && x.kind === 'Lab');
  const messages = s.messages.filter(x => orders.some(o => o.id === x.order) && x.patient === c.patient && encounters.some(e => e.id === x.encounter));
  const results = s.results.filter(x => orders.some(o => o.id === x.order) && x.patient === c.patient && messages.some(m => m.control === x.message && m.order === x.order && m.encounter === x.encounter));
  const loaded = results.filter(x => s.pipeline.snapshot?.results?.some(r => r.id === x.id && r.value === x.value) && s.pipeline.cache?.results?.some(r => r.id === x.id && r.value === x.value));
  const documents = s.artifacts.filter(x => x.capstone === c.id);
  const checks = [
    check('Register a new fictional patient during this attempt', !c.baseline.patients.includes(c.patient) && s.patients.some(x => x.id === c.patient), [c.patient]),
    check('Create an encounter for that patient', encounters.length, ids(encounters)),
    check('Create, collect and process a lab specimen in that encounter', orders.some(o => s.specimens.some(x => x.order === o.id && ['Processing','Final'].includes(x.status))), ids(orders)),
    check('Observe an unmapped interface rejection for that order', messages.some(m => (m.trainingEvents || []).some(x => x.error === 'Unmapped local code')), ids(messages)),
    check('Repair mapping and acknowledge the same message', messages.some(m => m.status === 'Acknowledged' && (m.trainingEvents || []).some(x => x.error === 'Unmapped local code')), ids(messages)),
    check('Produce exactly one associated result per successful message', results.length > 0 && messages.filter(m => m.status === 'Acknowledged').every(m => results.filter(r => r.message === m.control).length === 1), ids(results)),
    check('Review associated critical results', results.length && results.every(r => !r.critical || r.reviewed), ids(results)),
    check('Load and cache the associated result with a clean pipeline', loaded.length && s.pipeline.status === 'Current' && s.pipeline.failure === 'None', ids(loaded)),
    check('Save an investigation and validation document for this attempt', documents.some(x => x.type === 'Capstone resolution'), ids(documents)),
    check('Save a capstone reflection', (s.progress?.['DAY-6']?.reflection || '').length >= 15),
  ];
  return { score: checks.filter(x => x.passed).length * 10, max: 100, passed: checks.every(x => x.passed), checks };
}
export function trainingSummary(s) {
  const a = s.audit || [];
  const changed = action => a.some(x => x.action === action);
  const criteria = [
    [check('Register a patient', changed('register')), check('Check in a scheduled visit', a.some(x => x.action === 'appointmentStatus' && /"status":"Arrived"/.test(x.detail))), check('Transfer an encounter', s.transfers.length)],
    [check('Review a result', s.results.some(x => x.reviewed)), check('Obtain attending cosign', changed('cosign')), check('Add a signed-note addendum', s.notes.some(x => x.addenda?.length))],
    [check('Resolve an incident with evidence and successful verification', s.tickets.some(x => x.status === 'Resolved' && x.verified && x.evidence.length >= 3))],
    [check('Acknowledge an interface message', s.messages.some(x => x.status === 'Acknowledged')), check('Exercise the API lab', s.apiHistory.length)],
    [check('Complete all fifteen SQL exercises', Array.from({length:15}, (_,i) => s.progress?.['SQL-' + (i+1)]?.passed).every(Boolean)), check('Refresh reporting extract', s.pipeline.status === 'Current')],
    [check('Test, approve, release and roll back a change', s.changes.some(x => x.status === 'Rolled back' && x.tests?.length === 4)), check('Observe a reporting failure', s.pipeline.runs.some(x => x.status === 'Failed' || x.detail !== 'Source, staging, reporting and cache reconciled'))],
    capstoneAssessment(s).checks,
  ];
  return { lessons: lessons.map(([title, roles, instructions], index) => {
    const checks = criteria[index], reflection = s.progress?.['DAY-' + index]?.reflection || '';
    return { index, title, roles, instructions, checks, reflection, completed: checks.length > 0 && checks.every(x => x.passed) && reflection.length >= 15 };
  }), capstone: capstoneAssessment(s), label: 'Transparent evidence checks for self-practice; not certification or a secure examination' };
}
export function trainingAction(s, action, p) {
  if (action === 'lesson') {
    if (!Number.isInteger(p.index) || !lessons[p.index]) throw Error('Unknown lesson');
    s.progress['DAY-' + p.index] = { at: new Date().toISOString(), reflection: text(p.reflection, 'Reflection') };
  } else if (action === 'startCapstone') {
    if (p.confirm !== 'START') throw Error('Type START to begin a new capstone attempt');
    delete s.progress['DAY-6'];
    s.capstone = { id: 'CAP-' + crypto.randomUUID(), at: new Date().toISOString(), patient: null, baseline: { patients: ids(s.patients), encounters: ids(s.encounters) } };
  } else if (action === 'capstonePatient') {
    if (!s.capstone || !s.patients.some(x => x.id === p.patient) || s.capstone.baseline.patients.includes(p.patient)) throw Error('Start an attempt, then register and select a new patient');
    s.capstone.patient = p.patient;
  } else if (action === 'capstoneDocument') {
    if (!s.capstone?.patient) throw Error('Select the capstone patient first');
    s.artifacts.push({ id: 'DOC-' + crypto.randomUUID(), capstone: s.capstone.id, type: 'Capstone resolution', title: 'Capstone investigation', body: ['scope','cause','action','validation','followup'].map(k => k + ': ' + text(p[k], k)).join('\n'), author: s.role, at: new Date().toISOString() });
  } else return null;
  return s;
}
export function trainingWorkspace(state, action, p) {
  const snapshots = state.trainingSnapshots || [];
  if (action === 'trainingSnapshot') {
    if (snapshots.length >= 3) throw Error('Three snapshots are saved. Delete one before creating another.');
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    if (!name || name.length > 80) throw Error('Snapshot name requires 1–80 characters');
    const { trainingSnapshots: omitted, ...copy } = state; void omitted;
    return { ...state, trainingSnapshots: [...snapshots, { id: 'SNAP-' + crypto.randomUUID(), name, at: new Date().toISOString(), state: structuredClone(copy) }] };
  }
  if (action === 'trainingDeleteSnapshot') return { ...state, trainingSnapshots: snapshots.filter(x => x.id !== p.id) };
  if (action === 'trainingRestore') {
    if (p.confirm !== 'RESTORE') throw Error('Type RESTORE to replace this session with the saved snapshot');
    const snapshot = snapshots.find(x => x.id === p.id);
    if (!snapshot) throw Error('Snapshot not found');
    const copy = structuredClone(snapshot.state);
    if (copy.hospital?.reportingSchedule) copy.hospital.reportingSchedule.enabled = false;
    return { ...copy, trainingSnapshots: snapshots };
  }
  if (action === 'trainingReset') {
    if (p.confirm !== 'RESET') throw Error('Type RESET to clear this session’s practice records');
    return { ...state, clinical: normalizeClinical({}), hospital: seed(), trainingSnapshots: snapshots };
  }
  return null;
}
export function trainingExport(s) {
  return { formatVersion: 1, exportedAt: new Date().toISOString(), assessment: trainingSummary(s), capstone: s.capstone || null, documents: s.artifacts, incidents: s.tickets.filter(x => x.resolved).map(x => ({ id: x.id, score: x.score, assessment: x.scenarioAssessment, resolution: x.resolution })), sql: s.progress, pipeline: { status: s.pipeline.status, runs: s.pipeline.runs }, jobs: s.jobs };
}
export function trainingMarkdown(data) {
  const lines = ['# Training practice results', '', data.assessment.label, '', 'Exported: ' + data.exportedAt];
  for (const day of data.assessment.lessons) { lines.push('', '## ' + day.title, '', day.completed ? 'Complete' : 'In progress', '', day.instructions, '', ...day.checks.map(x => '- [' + (x.passed ? 'x' : ' ') + '] ' + x.label), '', 'Reflection:', '', day.reflection || '(not recorded)'); }
  lines.push('', '## Capstone', '', 'Score: ' + data.assessment.capstone.score + '/100');
  for (const doc of data.documents) lines.push('', '### ' + doc.title, '', doc.body);
  lines.push('', '## Incident assessments', '', '```json', JSON.stringify(data.incidents, null, 2), '```', '', '## SQL and reflection progress', '', '```json', JSON.stringify(data.sql, null, 2), '```', '', '## Reporting loads and jobs', '', '```json', JSON.stringify({ pipeline: data.pipeline, jobs: data.jobs }, null, 2), '```');
  return lines.join('\n');
}
