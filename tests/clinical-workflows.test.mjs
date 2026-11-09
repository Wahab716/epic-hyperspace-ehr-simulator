import assert from 'node:assert/strict';
import test from 'node:test';
import { hospitalFor, applyWorkflow, importChart, chartFromHospital } from '../lib/workspace/workflows.mjs';
import { normalizeClinical } from '../public/clinical/workspace-state.mjs';

function practice() {
  let state = hospitalFor({ clinical: null });
  return { get state() { return state; }, act(action, payload) { state = applyWorkflow(state, action, payload); return state; } };
}
function admitted() {
  const p = practice();
  p.act('role', { role: 'Registrar' });
  p.act('register', { name: 'Weekend, Practice', dob: '1990-04-05', allergies: 'None known' });
  const patient = p.state.patients.at(-1).id;
  p.act('admit', { patient, unit: 'E8 Med/Surg', bed: 'TEST-501' });
  return { p, patient, encounter: p.state.encounters.at(-1).id };
}

test('registration, duplicate detection, birth dates, and permissions are enforced', () => {
  const p = practice();
  assert.throws(() => p.act('register', { name: 'Sample', dob: '1990-01-01' }), /not allowed/);
  p.act('role', { role: 'Registrar' });
  p.act('register', { name: 'Sample', dob: '1990-01-01', allergies: 'Unknown' });
  const before = JSON.stringify(p.state);
  assert.throws(() => p.act('register', { name: ' Sample ', dob: '1990-01-01' }), /duplicate/);
  for (const dob of ['2099-01-01','2026-02-30','bad']) assert.throws(() => p.act('register', { name: 'Invalid', dob }), /birth date/);
  assert.equal(JSON.stringify(p.state), before);
});

test('scheduling, rescheduling, check-in, and cancellation retain encounter history', () => {
  const p = practice(); p.act('role', { role: 'Registrar' });
  const payload = { patient: '16442684', provider: 'Dr. Hale', time: '2027-01-10T14:00:00Z', visitType: 'Follow-up' };
  p.act('schedule', payload); const id = p.state.appointments.at(-1).id;
  assert.throws(() => p.act('schedule', { ...payload, provider: ' Dr. Hale ' }), /booked/);
  assert.throws(() => p.act('reschedule', { ...payload, id, patient: '9301254' }), /association/);
  p.act('reschedule', { ...payload, id, time: '2027-01-11T14:00:00Z' });
  assert.equal(p.state.appointments.at(-1).history.length, 1);
  p.act('appointmentStatus', { id, status: 'Arrived' });
  const encounter = p.state.appointments.at(-1).encounter;
  assert.equal(p.state.encounters.find(e => e.id === encounter).status, 'In progress');
  p.act('appointmentStatus', { id, status: 'Cancelled' });
  assert.equal(p.state.encounters.find(e => e.id === encounter).status, 'Cancelled');
  assert.throws(() => p.act('appointmentStatus', { id, status: 'Arrived' }), /transition/);
});

test('admission and transfer protect occupied beds and preserve transfer history', () => {
  const { p, patient, encounter } = admitted();
  assert.throws(() => p.act('admit', { patient, unit: 'ICU', bed: 'FREE' }), /Already admitted/);
  assert.throws(() => p.act('transfer', { id: encounter, unit: 'E8', bed: ' 814101 ' }), /occupied/);
  p.act('role', { role: 'Nurse' }); p.act('transfer', { id: encounter, unit: 'P3 ICU', bed: 'FREE-ICU' });
  assert.equal(p.state.encounters.find(e => e.id === encounter).bed, 'FREE-ICU');
  assert.equal(p.state.transfers.at(-1).encounter, encounter);
});

test('lab orders require signing, collection, receipt, processing, and result review', () => {
  const { p, encounter } = admitted();
  p.act('role', { role: 'Attending' }); p.act('order', { encounter, kind: 'Lab', name: 'Practice potassium', instructions: 'Scenario test' });
  const order = p.state.orders.at(-1).id;
  assert.throws(() => p.act('orderStatus', { id: order, status: 'Collected' }), /not allowed|Sign/);
  p.act('orderStatus', { id: order, status: 'Signed' }); p.act('role', { role: 'Nurse' });
  p.act('orderStatus', { id: order, status: 'Collected' }); const specimen = p.state.specimens.at(-1).id;
  assert.throws(() => p.act('result', { id: order, value: '6.2', critical: true }), /receive|process/);
  assert.throws(() => p.act('specimen', { id: specimen, status: 'Processing' }), /receipt/);
  p.act('specimen', { id: specimen, status: 'Received' }); p.act('specimen', { id: specimen, status: 'Processing' });
  p.act('result', { id: order, value: '6.2', critical: true }); const result = p.state.results.at(-1).id;
  assert.equal(p.state.results.at(-1).encounter, encounter);
  p.act('reviewResult', { id: result, note: 'Scenario follow-up documented with the responsible clinician.' });
  p.act('correctResult', { id: result, value: '4.2', reason: 'Corrected synthetic specimen value' });
  assert.equal(p.state.results.at(-1).reviewed, false);
  assert.equal(p.state.results.at(-1).history[0].value, '6.2');
  assert.equal(p.state.results.at(-1).revision, 2);
});

test('notes require author permission, resident cosigning, and immutable signed text', () => {
  const { p, encounter } = admitted(); p.act('role', { role: 'Resident' });
  p.act('note', { encounter, type: 'Progress', body: 'Assessment pending ***', sign: false }); const id = p.state.notes.at(-1).id;
  assert.throws(() => p.act('signNote', { id }), /placeholder/);
  p.act('editNote', { id, body: 'Completed scenario assessment.' }); p.act('signNote', { id });
  assert.equal(p.state.notes.at(-1).status, 'Cosign Needed');
  assert.throws(() => p.act('cosign', { id }), /not allowed/);
  p.act('role', { role: 'Attending' }); p.act('cosign', { id });
  assert.throws(() => p.act('editNote', { id, body: 'Overwrite' }), /immutable/);
  p.act('addendum', { id, body: 'Additional scenario detail.' });
  assert.equal(p.state.notes.at(-1).body, 'Completed scenario assessment.');
  assert.equal(p.state.notes.at(-1).addenda.length, 1);
});

test('medication administration requires the signed order and exact identity verification', () => {
  const { p, patient, encounter } = admitted(); p.act('role', { role: 'Attending' });
  p.act('order', { encounter, kind: 'Medication', name: 'Scenario medication', instructions: 'Scenario-only instructions' }); const id = p.state.orders.at(-1).id;
  p.act('orderStatus', { id, status: 'Signed' }); p.act('role', { role: 'Nurse' });
  const administration = { id, patient, checked: true, status: 'Held', note: 'Held according to the practice scenario.' };
  assert.throws(() => p.act('administer', { ...administration, patient: '9301254' }), /identity/);
  assert.throws(() => p.act('administer', { ...administration, checked: 'false' }), /Verify/);
  p.act('administer', administration);
  assert.equal(p.state.medications.at(-1).status, 'Held');
});

test('discharge requires reconciliation, signed summary, and critical-result follow-up', () => {
  const { p, patient, encounter } = admitted(); p.act('role', { role: 'Attending' });
  assert.throws(() => p.act('discharge', { id: encounter, followup: 'Scenario follow-up.' }), /reconciliation|summary/);
  p.act('homeMed', { patient, name: 'Home scenario medication' }); const med = p.state.homeMeds.at(-1).id;
  p.act('reconcileMed', { id: med, decision: 'Clarify', reason: 'Clarification pending' });
  p.act('medrec', { id: encounter, note: 'Medication review recorded.' });
  p.act('note', { encounter, type: 'Discharge Summary', body: 'Completed synthetic discharge summary.', sign: true });
  assert.throws(() => p.act('discharge', { id: encounter, followup: 'Scenario follow-up.' }), /home medication/);
  p.act('reconcileMed', { id: med, decision: 'Continue', reason: 'Scenario confirms the decision.' });
  p.act('discharge', { id: encounter, followup: 'Scenario follow-up appointment and return instructions.' });
  assert.equal(p.state.encounters.find(e => e.id === encounter).status, 'Discharged');
  assert.throws(() => p.act('observation', { encounter, type: 'Pulse', value: '80' }), /active encounter/);
});

test('observations, simulated communications, and list membership preserve associations', () => {
  const { p, patient, encounter } = admitted(); p.act('role', { role: 'Nurse' });
  p.act('observation', { encounter, type: 'Pulse', value: '80 bpm' });
  p.act('communicate', { patient, destination: 'Internal', recipient: 'Practice care team', body: 'Please review this synthetic observation.' });
  p.act('list', { patient, add: true }); p.act('list', { patient, add: false });
  assert.equal(p.state.observations.at(-1).patient, patient);
  assert.equal(p.state.communications.at(-1).status, 'Sent in simulation');
  assert.ok(p.state.patients.some(person => person.id === patient));
});

test('commit-4 chart notes and stickies import without losing their original copy', () => {
  const chart = normalizeClinical({ fluids: [{mrn:'16442684',date:'Yesterday',type:'Intake',value:250}], stickies: { '16442684': 'Saved sticky' }, notes: [{ mrn: '16442684', body: 'Existing pended note', type: 'Progress', status: 'Pended', date: 'Yesterday' }] });
  const original = JSON.stringify(chart), hospital = hospitalFor({ clinical: chart });
  assert.equal(JSON.stringify(chart), original);
  assert.equal(hospital.sticky['16442684'], 'Saved sticky');
  assert.equal(hospital.observations.find(o=>o.provenance==='Imported chart practice').value, '250 mL');
  const note = hospital.notes.find(n => n.provenance === 'Imported chart practice');
  const updated = applyWorkflow(hospital, 'editNote', { id: note.id, body: 'Updated connected note' });
  assert.equal(chartFromHospital(chart, updated).notes[0].body, 'Updated connected note');
  assert.equal(importChart(updated, chartFromHospital(chart, updated)).notes.filter(n => n.id === note.id).length, 1);
});

test('later analytics actions stay unavailable until their milestones', () => {
  const p = practice();
  assert.throws(() => p.act('role', { role: 'Reporting Analyst' }), /available practice role/);
  assert.throws(() => p.act('queryHistory', { sql: 'SELECT 1' }), /not available/);
});

test('an unreviewed critical result blocks an otherwise complete discharge', () => {
  const { p, encounter } = admitted(); p.act('role', { role: 'Attending' });
  p.act('order', { encounter, kind: 'Lab', name: 'Scenario lab', instructions: 'Practice only' }); const order = p.state.orders.at(-1).id;
  p.act('orderStatus', { id: order, status: 'Signed' }); p.act('role', { role: 'Nurse' }); p.act('orderStatus', { id: order, status: 'Collected' }); const specimen = p.state.specimens.at(-1).id;
  p.act('specimen', { id: specimen, status: 'Received' }); p.act('specimen', { id: specimen, status: 'Processing' }); p.act('result', { id: order, value: 'Critical synthetic value', critical: true }); const result = p.state.results.at(-1).id;
  p.act('role', { role: 'Attending' }); p.act('medrec', { id: encounter, note: 'Review complete.' }); p.act('note', { encounter, type: 'Discharge Summary', body: 'Summary complete.', sign: true });
  assert.throws(() => p.act('discharge', { id: encounter, followup: 'Follow-up recorded.' }), /critical/);
  p.act('reviewResult', { id: result, note: 'Responsible clinician follow-up documented.' }); p.act('discharge', { id: encounter, followup: 'Follow-up recorded.' });
  assert.equal(p.state.encounters.find(e => e.id === encounter).status, 'Discharged');
});

test('legacy chart snapshots cannot bypass connected role or note-author rules', () => {
  const before = normalizeClinical({});
  const hospital = hospitalFor({ clinical: before });
  const registrar = applyWorkflow(hospital, 'role', { role: 'Registrar' });
  const changed = normalizeClinical({ stickies: { '16442684': 'Unauthorized edit' } });
  assert.throws(() => importChart(registrar, changed, before), /clinical practice role/);
  const resident = applyWorkflow(hospital, 'role', { role: 'Resident' });
  const signed = normalizeClinical({ notes: [{ mrn: '16442684', body: 'Resident self-sign attempt', type: 'Progress', status: 'Signed' }] });
  assert.throws(() => importChart(resident, signed, before), /cosign/);
});
