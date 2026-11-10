import { trainingAction } from './training.mjs';
import { seed, migrate, apply } from '../training/domain.mjs';
import { normalizeClinical, patientIds } from '../../public/clinical/workspace-state.mjs';

export const clinicalRoles = ['Registrar', 'Nurse', 'Resident', 'Attending'];
export const practiceRoles = [...clinicalRoles, 'Help Desk', 'Application Analyst', 'Access Administrator', 'Reporting Analyst'];
const allowed = new Set(['role','register','demographics','schedule','reschedule','appointmentStatus','admit','transfer','medrec','discharge','order','orderStatus','specimen','result','reviewResult','correctResult','note','editNote','signNote','cosign','addendum','homeMed','reconcileMed','administer','observation','communicate','sticky','list','ticketContext','ticketHint','evidence','fix','verifyTicket','resolve','accessApproval','mapping','correctInbound','enqueue','replay','apiConfig','apiRequest','gateway','diagnostic','change','changeTest','changeApprove','changeRelease','changeRollback','refresh','saveQuery','queryHistory','exerciseResult','pipelineFailure','failPipeline','queueJob','processJobs','reportSchedule','lesson','startCapstone','capstonePatient','capstoneDocument','artifact']);
const now = () => new Date().toISOString();
const active = (s, id) => {
  const encounter = s.encounters.find(e => e.id === id);
  if (!encounter || !['Admitted', 'In progress'].includes(encounter.status)) throw new Error('An active encounter is required');
  return encounter;
};
function cleanDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || Date.parse(value) > Date.now()) throw new Error('A valid birth date that is not in the future is required');
}
// Import existing chart work with stable identifiers. It remains recoverable in clinical.
export function importChart(hospital, chart, previousChart) {
  if (!chart) return hospital;
  const c = normalizeClinical(chart);
  if (previousChart !== undefined) {
    const before = normalizeClinical(previousChart || {});
    const protectedFields = ['notes','orders','fluids','stickies','resultsReviewed','notesReviewed'];
    const authored = protectedFields.some(key => JSON.stringify(before[key]) !== JSON.stringify(c[key])) || Object.values(c.drafts).some(d => d.body.trim()) && JSON.stringify(before.drafts) !== JSON.stringify(c.drafts);
    if (authored && !['Nurse','Resident','Attending'].includes(hospital.role)) throw new Error('Switch to a clinical practice role before editing chart records');
    if (JSON.stringify(before.orders) !== JSON.stringify(c.orders) && !['Resident','Attending'].includes(hospital.role)) throw new Error('Only a Resident or Attending may create or cancel orders');
    for (let index = 0; index < c.notes.length; index++) {
      const n = c.notes[index], prior = before.notes[index];
      if (hospital.role === 'Resident' && n.status === 'Signed' && (!prior || prior.status !== 'Signed')) throw new Error('Resident notes require attending cosign; use connected Notes or select a cosigner');
    }
  }
  hospital.personalList = [...hospital.personalList.filter(id => !patientIds.includes(id)), ...c.members.map(index => patientIds[index])];
  hospital.sticky = { ...hospital.sticky, ...c.stickies };
  for (const [index, note] of c.notes.entries()) {
    const id = 'CHART-NOTE-' + note.mrn + '-' + index;
    const existing = hospital.notes.find(n => n.id === id);
    const encounter = hospital.encounters.find(e => e.patient === note.mrn && e.status === 'Admitted');
    if (!encounter) continue;
    if (existing && existing.body !== note.body && !['Signed','Cosign Needed'].includes(existing.status) && existing.author !== hospital.role) throw new Error('Only the author role may edit this draft');
    if (existing && ['Signed','Cosign Needed'].includes(existing.status) && (existing.body !== note.body || existing.status !== note.status)) throw new Error('Signed notes are immutable; use a connected note addendum');
    const imported = { id, patient: note.mrn, encounter: existing?.encounter || encounter.id, type: note.type, body: note.body, status: note.status === 'Draft' ? 'Pended' : note.status, author: existing?.author || (clinicalRoles.includes(hospital.role) ? hospital.role : 'Attending'), cosigner: note.cosigner, created: existing?.created || now(), addenda: existing?.addenda || [], provenance: 'Imported chart practice', chartIndex: index };
    if (existing) Object.assign(existing, imported); else hospital.notes.push(imported);
  }
  for (const [index, order] of c.orders.entries()) {
    const id = 'CHART-ORDER-' + order.mrn + '-' + index;
    const encounter = hospital.encounters.find(e => e.patient === order.mrn && e.status === 'Admitted');
    const existing = hospital.orders.find(o => o.id === id);
    if (existing) { if (order.status === 'Discontinued' && !['Cancelled','Resulted'].includes(existing.status)) existing.status = 'Cancelled'; continue; }
    if (!encounter) continue;
    hospital.orders.push({ id, patient: order.mrn, encounter: encounter.id, kind: 'Lab', name: order.name, instructions: order.detail || 'Imported practice order: verify before signing', status: order.status === 'Discontinued' ? 'Cancelled' : 'Draft', created: now(), provenance: 'Imported chart practice', chartIndex: index });
  }
  for (const [index, measurement] of c.fluids.entries()) {
    const id = 'CHART-OBS-' + measurement.mrn + '-' + index;
    const encounter = hospital.encounters.find(e => e.patient === measurement.mrn && e.status === 'Admitted');
    if (encounter && !hospital.observations.some(o => o.id === id)) hospital.observations.push({ id, patient: measurement.mrn, encounter: encounter.id, type: measurement.type, value: measurement.value + ' mL', at: now(), provenance: 'Imported chart practice' });
  }
  return hospital;
}
export function hospitalFor(workspace) {
  return workspace.hospital ? migrate(structuredClone(workspace.hospital)) : importChart(seed(), workspace.clinical);
}
export function applyWorkflow(input, action, payload = {}) {
  if (!allowed.has(action)) throw new Error('This workflow is not available in this milestone');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid workflow payload');
  const s = structuredClone(input), p = { ...payload };
  for (const key of ['name','bed','unit','provider']) if (typeof p[key] === 'string') p[key] = p[key].trim();
  if (action === 'role' && !practiceRoles.includes(p.role)) throw new Error('Choose an available practice role');
  if (['register','demographics'].includes(action)) cleanDate(p.dob);
  if (action === 'reschedule') {
    const appointment = s.appointments.find(a => a.id === p.id);
    if (!appointment || appointment.patient !== p.patient) throw new Error('Appointment/patient association mismatch');
  }
  if (['observation','note','order'].includes(action)) active(s, p.encounter);
  if (['transfer','medrec','discharge'].includes(action)) active(s, p.id);
  if (['orderStatus','administer'].includes(action)) {
    const order = s.orders.find(o => o.id === p.id);
    if (!order) throw new Error('Order not found');
    if (p.status !== 'Cancelled') active(s, order.encounter);
  }
  if (action === 'administer' && p.checked !== true) throw new Error('Verify medication and patient identity');
  for (const key of ['sign','critical','passed']) if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new Error('Invalid checkbox value');
  if (action === 'ticketHint' && !['Help Desk','Application Analyst'].includes(s.role)) throw new Error('Support role required');
  if (action === 'reportSchedule') {
    if (!['Reporting Analyst','Application Analyst'].includes(s.role)) throw new Error('Reporting role required');
    if (typeof p.enabled !== 'boolean') throw new Error('Schedule requires a boolean');
    s.reportingSchedule = { enabled: p.enabled, nextRun: new Date(Date.now() + 3600000).toISOString() };
    return s;
  }
  const trained = trainingAction(s, action, p);
  if (trained) return trained;
  const result = apply(s, action, p);
  if (action === 'replay') {
    const message = result.messages.find(x => x.id === p.id);
    if (message) { message.trainingEvents ??= []; message.trainingEvents.push({ at: now(), status: message.status, error: message.error || '' }); }
  }
  if (action === 'appointmentStatus' && p.status === 'Cancelled') {
    const appointment = result.appointments.find(a => a.id === p.id);
    const encounter = result.encounters.find(e => e.id === appointment.encounter);
    if (encounter && encounter.status === 'In progress') { encounter.status = 'Cancelled'; encounter.discharged = now(); }
  }
  return result;
}
export function chartFromHospital(chart, hospital) {
  if (!chart) return chart;
  const c = normalizeClinical(chart);
  for (const id of patientIds) {
    if (Object.hasOwn(hospital.sticky, id)) c.stickies[id] = hospital.sticky[id];
  }
  c.members = hospital.personalList.filter(id => patientIds.includes(id)).map(id => patientIds.indexOf(id));
  for (const order of hospital.orders.filter(o => o.chartIndex !== undefined)) { const row = c.orders[order.chartIndex]; if (row?.mrn === order.patient && order.status === 'Cancelled') row.status = 'Discontinued'; }
  for (const n of hospital.notes.filter(n => n.chartIndex !== undefined)) {
    const original = c.notes[n.chartIndex];
    if (original?.mrn === n.patient) Object.assign(original, { body: n.body, status: n.status, cosigner: n.cosigner || '' });
  }
  return c;
}
