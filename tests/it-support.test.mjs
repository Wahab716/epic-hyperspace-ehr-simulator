import assert from 'node:assert/strict';
import test from 'node:test';
import { hospitalFor, applyWorkflow } from '../lib/workspace/workflows.mjs';
import { cases } from '../lib/training/catalog.mjs';

function support(role = 'Application Analyst') {
  let state = applyWorkflow(hospitalFor({ clinical: null }), 'role', { role });
  return { get state() { return state; }, act(action, payload = {}) { state = applyWorkflow(state, action, payload); return state; } };
}
function investigate(p, id) {
  p.act('ticketContext', { id, impact: 'The scenario prevents the requester from completing their original workflow.', scope: 'The practice user, department, device, patient and encounter were checked.', hypothesis: 'Compare the caller report with the configuration and log evidence.', assignee: 'Practice support team' });
  for (const source of ['Caller','Logs','Configuration']) p.act('evidence', { id, source });
}
const resolution = scenario => ({
  cause: scenario.evidence.Logs + ' ' + scenario.evidence.Configuration,
  action: 'The approved authorized action was applied or escalated to the responsible team: ' + scenario.action,
  validation: 'Verified the original workflow and compared the resulting status: ' + scenario.verification,
  communication: 'The requester and responsible clinician team received a plain-language scenario update describing the outcome.',
  followup: 'The assigned owner will monitor the workflow, review the audit evidence, and escalate any repeated failure.',
});

test('ticket actions require scope and all evidence; unsafe attempts change no permissions', () => {
  const p = support('Help Desk'), scenario = cases[0];
  assert.throws(() => p.act('fix', { id: scenario.id, choice: scenario.action }), /scope/);
  investigate(p, scenario.id);
  const roles = JSON.stringify(p.state.users);
  p.act('fix', { id: scenario.id, choice: 'Grant unrestricted access' });
  assert.equal(p.state.tickets[0].attempts.at(-1).correct, false);
  assert.equal(JSON.stringify(p.state.users), roles);
  assert.throws(() => p.act('resolve', { id: scenario.id, ...resolution(scenario) }), /validation/);
});

test('locked-account resolution validates before recording the incident closure', () => {
  const p = support('Help Desk'), scenario = cases[0]; investigate(p, scenario.id);
  p.act('fix', { id: scenario.id, choice: scenario.action });
  assert.equal(p.state.users[0].status, 'Active');
  assert.equal(p.state.sessions[0].loginAttempts, 0);
  p.act('verifyTicket', { id: scenario.id }); p.act('resolve', { id: scenario.id, ...resolution(scenario) });
  assert.equal(p.state.tickets[0].status, 'Resolved');
  assert.ok(p.state.tickets[0].score >= 0 && p.state.tickets[0].score <= 100);
  assert.ok(p.state.audit.some(a => a.action === 'resolve'));
});

test('nursing access requires the approved Access Administrator handoff', () => {
  const p = support('Help Desk'), scenario = cases[1]; investigate(p, scenario.id);
  p.act('fix', { id: scenario.id, choice: scenario.action });
  const task = p.state.tasks.find(t => t.type === 'Approved access');
  assert.equal(p.state.users[1].role, 'Viewer');
  assert.throws(() => p.act('accessApproval', { id: task.id }), /not allowed/);
  p.act('verifyTicket', { id: scenario.id }); assert.equal(p.state.tickets[1].verified, false);
  p.act('role', { role: 'Access Administrator' }); p.act('accessApproval', { id: task.id });
  assert.equal(p.state.users[1].role, 'Nurse');
  p.act('role', { role: 'Help Desk' }); p.act('verifyTicket', { id: scenario.id });
  assert.equal(p.state.tickets[1].verified, true);
});

test('interface mapping links one result and duplicate replay remains idempotent', () => {
  const p = support(); p.act('mapping', { code: 'K_LOCAL', target: '2823-3' });
  p.act('replay', { id: 'MSG-100' }); p.act('replay', { id: 'MSG-100' });
  const rows = p.state.results.filter(r => r.message === 'CTRL-4401');
  assert.equal(rows.length, 1); assert.equal(rows[0].patient, '16442684'); assert.equal(rows[0].encounter, 'ENC-100');
  p.act('correctInbound', { id: 'MSG-100', control: 'CTRL-CORRECT', value: '4.1', reason: 'Corrected synthetic source value' });
  const correction = p.state.messages.at(-1).id; p.act('replay', { id: correction }); p.act('replay', { id: correction });
  const result = p.state.results.find(r => r.id === rows[0].id);
  assert.equal(result.value, '4.1'); assert.equal(result.history.length, 1); assert.equal(result.history[0].value, '6.2');
});

test('conflicting patient and encounter associations are quarantined without attaching results', () => {
  const p = support(); p.act('mapping', { code: 'K_LOCAL', target: '2823-3' });
  p.act('enqueue', { order: 'ORD-100', control: 'BAD-IDENTITY', code: 'K_LOCAL', value: '5.2', patient: '9301254', encounter: 'ENC-101' });
  const id = p.state.messages.at(-1).id; p.act('replay', { id });
  assert.equal(p.state.messages.at(-1).status, 'Quarantined');
  assert.equal(p.state.results.length, 0);
});

test('API lab models authorization, scope, environment, availability, and valid requests', () => {
  const p = support(); const send = () => p.act('apiRequest', { encounter: 'ENC-100' }).apiHistory[0].status;
  assert.equal(send(), 401);
  p.act('apiConfig', { token: 'Valid', scope: '', environment: 'Practice' }); assert.equal(send(), 403);
  p.act('apiConfig', { token: 'Valid', scope: 'Observation.read', environment: 'Wrong environment' }); assert.equal(send(), 404);
  p.act('apiConfig', { token: 'Valid', scope: 'Observation.read', environment: 'Practice' }); assert.equal(send(), 200);
  assert.equal(p.state.apiHistory[0].payload.resourceType, 'Bundle');
  p.act('gateway', { status: 'Unavailable' }); assert.equal(send(), 503);
});

test('diagnostics are restricted simulations and do not accept arbitrary commands', () => {
  const p = support('Help Desk'); p.act('diagnostic', { command: 'curl /health' });
  assert.match(p.state.logs[0].message, /HTTP 200/);
  assert.throws(() => p.act('diagnostic', { command: 'rm -rf /' }), /supported diagnostic/);
  p.act('role', { role: 'Registrar' }); assert.throws(() => p.act('ticketHint', { id: cases[0].id }), /Support role/);
});

test('configuration releases require four tests and stakeholder approval before rollback', () => {
  const p = support();
  p.act('change', { key: 'requiredField', value: 'SCENARIO REQUIRED', department: 'P3 ICU', problem: 'A scenario field is missing.', requirements: 'Notes must include the required phrase.', impact: 'Only P3 ICU practice notes are affected.', rollback: 'Restore the previous configuration after validation.' });
  const id = p.state.changes.at(-1).id;
  assert.throws(() => p.act('changeRelease', { id }), /Approval/);
  for (const kind of ['Positive','Negative','Permission','Regression']) p.act('changeTest', { id, kind, steps: 'Run the original practice workflow.', expected: 'The scoped workflow matches the requirements.', actual: 'Observed the expected scoped behavior.', passed: true });
  assert.throws(() => p.act('changeApprove', { id, uat: 'Verified by the stakeholder.' }), /not allowed/);
  p.act('role', { role: 'Attending' }); p.act('changeApprove', { id, uat: 'The stakeholder verified the original workflow and approved release.' });
  p.act('role', { role: 'Application Analyst' }); p.act('changeRelease', { id });
  assert.equal(p.state.configuration.requiredField, 'SCENARIO REQUIRED');
  p.act('role', { role: 'Attending' }); assert.throws(() => p.act('note', { encounter: 'ENC-101', type: 'Progress', body: 'Missing required phrase.', sign: false }), /Required documentation/);
  p.act('role', { role: 'Application Analyst' }); p.act('changeRollback', { id, reason: 'Restore baseline and recheck the original workflow.' });
  assert.equal(p.state.configuration.requiredField, ''); assert.equal(p.state.changes.at(-1).status, 'Rolled back');
});

test('identity escalation preserves patient records and privacy incidents restrict exports', () => {
  const p = support('Help Desk'), identity = cases[4]; const patients = JSON.stringify(p.state.patients);
  investigate(p, identity.id); p.act('fix', { id: identity.id, choice: identity.action });
  assert.equal(JSON.stringify(p.state.patients), patients); assert.ok(p.state.tasks.some(t => t.source === identity.id));
  const privacy = cases[18]; investigate(p, privacy.id); p.act('fix', { id: privacy.id, choice: privacy.action });
  assert.equal(p.state.system.exportIdentifiers, false);
});

test('all 20 seeded incidents can reach a validated, documented resolution', () => {
  for (const scenario of cases) {
    const p = support(); investigate(p, scenario.id); p.act('fix', { id: scenario.id, choice: scenario.action });
    if (scenario.fix === 'access') {
      const task = p.state.tasks.find(t => t.type === 'Approved access');
      p.act('role', { role: 'Access Administrator' }); p.act('accessApproval', { id: task.id }); p.act('role', { role: 'Application Analyst' });
    }
    p.act('verifyTicket', { id: scenario.id });
    const ticket = p.state.tickets.find(t => t.id === scenario.id); assert.equal(ticket.verified, true, scenario.title);
    p.act('resolve', { id: scenario.id, ...resolution(scenario) });
    assert.equal(p.state.tickets.find(t => t.id === scenario.id).status, 'Resolved', scenario.title);
  }
});
