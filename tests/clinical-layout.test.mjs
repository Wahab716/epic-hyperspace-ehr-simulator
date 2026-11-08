import assert from 'node:assert/strict';
import test from 'node:test';


import { workspace } from './helpers/clinical-workspace.mjs';

test('patient list opens a chart with the selected fictional identity', () => {
  const chart = workspace();
  assert.match(chart.html(), /Patient Lists/);
  chart.run('openPatient(7)');
  assert.match(chart.html(), /Aneone Xxteshim/);
  assert.match(chart.html(), /MRN: 9301254/);
  assert.match(chart.html(), /Patient Summary/);
});

test('all activity tabs render without storage or a backend', () => {
  const chart = workspace();
  const views = {
    Summary: 'Patient Summary', 'Chart Review': 'Patient encounters',
    Results: 'CHEMISTRY PANELS', Notes: 'Number of notes shown',
    Orders: 'Active Orders', 'Intake/Output': 'Volume',
    Navigators: 'Admission workflow', Teams: 'Treatment Team',
    History: 'Medical History', Flowsheets: 'Vital signs flowsheet',
  };
  for (const [tab, content] of Object.entries(views)) {
    chart.run(`action(${JSON.stringify('tab:' + tab)})`);
    assert.ok(chart.html().includes(content), `${tab} should show ${content}`);
  }
});

test('invalid patient selection and unknown tabs preserve the current chart', () => {
  const chart = workspace();
  chart.run('openPatient(0)');
  const before = chart.html();
  for (const expression of ['openPatient(999)', "openPatient('Harden')", 'openPatient(-1)', "action('select:NaN')", "action('tab:Missing')"]) {
    chart.run(expression);
    assert.equal(chart.html(), before);
  }
});

test('laboratory categories and note filters display the matching fixtures', () => {
  const chart = workspace();
  chart.run("action('tab:Results'); action('category:HEMATOLOGY')");
  assert.match(chart.html(), /COMPLETE BLOOD COUNT/);
  assert.doesNotMatch(chart.html(), /CHEMISTRY PANELS/);
  chart.run("action('tab:Notes'); action('note-filter:Pharmacy')");
  assert.match(chart.html(), /Bajorek, Sarah/);
  assert.doesNotMatch(chart.html(), /◉ Hensley, Andrea/);
});

