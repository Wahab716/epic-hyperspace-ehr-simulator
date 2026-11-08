import assert from 'node:assert/strict';
import test from 'node:test';
import { workspace } from './helpers/clinical-workspace.mjs';

function searchControls(chart) {
  return {
    query: chart.control('#patient-query'),
    accept: chart.control('#accept-patient'),
    form: chart.control('#patient-form'),
    feedback: chart.control('#search-feedback'),
  };
}

test('Harden search submitted with Enter preserves the current chart', () => {
  const chart = workspace();
  chart.run('openPatient(7)');
  const before = chart.html();
  const { query, accept, form, feedback } = searchControls(chart);
  chart.run("action('global:Patient Station')");
  query.value = 'Harden';
  let prevented = false;
  form.onsubmit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(accept.disabled, false);
  assert.match(feedback.innerHTML, /Himsepsis, Harden/);
  assert.equal(chart.data().patient, 7);
  assert.equal(chart.html(), before);
  chart.run("action('accept-patient')");
  assert.equal(chart.data().patient, 7);
  assert.match(chart.html(), /Aneone Xxteshim/);
});

test('empty, nonexistent, ambiguous, and partial searches clear stale selection', () => {
  const chart = workspace();
  chart.run('openPatient(0)');
  const { query, accept, feedback } = searchControls(chart);
  for (const term of ['9301254', '', 'not-a-patient', 'Andrew', 'Harden']) {
    query.value = term;
    chart.run('findPatient()');
    assert.equal(accept.disabled, ['', 'not-a-patient', 'Andrew'].includes(term));
    assert.equal(chart.data().patient, 0);
    assert.match(chart.html(), /Harden Himsepsis/);
  }
  query.value = 'not-a-patient';
  chart.run("findPatient(); action('accept-patient')");
  assert.equal(chart.data().lookupMatch, null);
  assert.match(feedback.innerHTML, /No matching patients/);
});

test('Accept adds a found patient once and keeps membership after reload', () => {
  const chart = workspace();
  const { query } = searchControls(chart);
  query.value = '9301254';
  chart.run("findPatient(); action('accept-patient'); action('accept-patient')");
  assert.equal(chart.data().members.filter(index => index === 7).length, 1);
  assert.ok(workspace(chart.saved()).data().members.includes(7));
});

test('corrupt or incomplete browser state cannot replace chart fixtures', () => {
  for (const saved of ['{', 'null', '[]', JSON.stringify({ patient: 999, members: [null, 'Harden', 999, 0], notes: [null], orders: {}, drafts: { bad: null } })]) {
    const chart = workspace(saved);
    chart.run('openPatient()');
    assert.match(chart.html(), /Harden Himsepsis/);
    assert.equal(chart.data().patient, 0);
  }
});

test('a pended note survives reload and is only shown for its patient', () => {
  const chart = workspace();
  chart.run("openPatient(0); draft().body = '<p>Follow-up assessment</p>'; saveNote(false)");
  const loaded = workspace(chart.saved());
  loaded.run("openPatient(0); action('tab:Notes'); action('local-note:0')");
  assert.match(loaded.html(), /Follow-up assessment/);
  assert.equal(loaded.data().notes[0].status, 'Pended');
  loaded.run("openPatient(7); action('tab:Notes')");
  assert.doesNotMatch(loaded.html(), /Follow-up assessment/);
});

test('signing blocks unfinished templates and records completed practice notes', () => {
  const chart = workspace();
  chart.run("draft().body = '<p>Assessment: ***</p>'; saveNote(true)");
  assert.equal(chart.data().notes.length, 0);
  chart.run("draft().body = '<p>Assessment completed</p>'; saveNote(true)");
  assert.equal(chart.data().notes[0].status, 'Signed');
});

test('orders are patient-scoped, persist, and can be discontinued', () => {
  const chart = workspace();
  chart.run('openPatient(0)');
  chart.control('#order-name', 'Complete Blood Count');
  chart.control('#order-detail', 'Tomorrow morning');
  chart.run("action('save-order')");
  assert.equal(chart.data().orders[0].mrn, '16442684');
  assert.match(chart.html(), /Tomorrow morning/);
  chart.run("openPatient(7); action('tab:Orders'); action('discontinue:0')");
  assert.doesNotMatch(chart.html(), /Tomorrow morning/);
  assert.equal(chart.data().orders[0].status, 'Active');
  chart.run("openPatient(0); action('discontinue:0')");
  assert.equal(workspace(chart.saved()).data().orders[0].status, 'Discontinued');
});

test('sticky and review state persist separately for each patient', () => {
  const chart = workspace();
  chart.run("state.stickies[patient().mrn] = 'Recheck practice task'; action('timemark'); action('notes-read')");
  const loaded = workspace(chart.saved());
  assert.equal(loaded.data().stickies['16442684'], 'Recheck practice task');
  assert.equal(loaded.data().resultsReviewed['16442684'], true);
  loaded.run('openPatient(7)');
  assert.equal(loaded.data().resultsReviewed['9301254'], undefined);
  assert.equal(loaded.data().notesReviewed['9301254'], undefined);
});

test('blocked storage leaves search, chart navigation, and authoring usable', () => {
  const chart = workspace(undefined, { blocked: true });
  chart.run("openPatient(0); draft().body = '<p>Session-only note</p>'; saveNote(false); action('tab:Notes'); action('local-note:0')");
  assert.match(chart.html(), /Session-only note/);
  assert.equal(chart.saved(), undefined);
});
