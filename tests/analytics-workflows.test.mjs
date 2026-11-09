import assert from 'node:assert/strict';
import test from 'node:test';
import { hospitalFor, applyWorkflow } from '../lib/workspace/workflows.mjs';
import { csvResult } from '../public/sql-results.mjs';

test('Reporting Analyst can refresh a read-only extract, save queries, and record practice progress', () => {
  let s = applyWorkflow(hospitalFor({ clinical: null }), 'role', { role: 'Reporting Analyst' });
  s = applyWorkflow(s, 'refresh');
  assert.equal(s.pipeline.snapshot.patients.length, s.patients.length);
  s = applyWorkflow(s, 'saveQuery', { name: 'Encounter census', sql: 'SELECT status, COUNT(*) FROM encounters GROUP BY status' });
  s = applyWorkflow(s, 'queryHistory', { sql: 'SELECT COUNT(*) FROM patients', outcome: 'Returned 1 rows' });
  s = applyWorkflow(s, 'exerciseResult', { id: 'SQL-1', passed: true });
  assert.equal(s.queries[0].name, 'Encounter census');
  assert.equal(s.queryHistory.length, 1);
  assert.equal(s.scores['SQL-1'], 100);
  assert.match(s.progress['SQL-1'].label, /Self-practice/);
});

test('extracts stay unchanged until explicitly refreshed after clinical edits', () => {
  let s = applyWorkflow(hospitalFor({ clinical: null }), 'role', { role: 'Reporting Analyst' });
  s = applyWorkflow(s, 'refresh'); const before = s.pipeline.snapshot.patients.length;
  s = applyWorkflow(s, 'role', { role: 'Registrar' });
  s = applyWorkflow(s, 'register', { name: 'Analytics, Practice', dob: '1990-01-01', allergies: 'Unknown' });
  assert.equal(s.pipeline.snapshot.patients.length, before);
  s = applyWorkflow(s, 'role', { role: 'Reporting Analyst' }); s = applyWorkflow(s, 'refresh');
  assert.equal(s.pipeline.snapshot.patients.length, before + 1);
});

test('clinical-only roles cannot save SQL queries and later reporting jobs stay unavailable', () => {
  const s = applyWorkflow(hospitalFor({ clinical: null }), 'role', { role: 'Nurse' });
  assert.throws(() => applyWorkflow(s, 'saveQuery', { name: 'Denied', sql: 'SELECT 1' }), /not allowed/);
  assert.throws(() => applyWorkflow(s, 'refresh'), /not allowed/);
  assert.throws(() => applyWorkflow(s, 'queueJob'), /not available/);
});

test('CSV exports preserve duplicate columns, nulls, commas, quotes, newlines, and empty headers', () => {
  const csv = csvResult({ columns: ['id','id','note'], values: [['P1','E1','a,"b"\nc'], [null,0,'']] });
  assert.equal(csv, '"id","id","note"\r\n"P1","E1","a,""b""\nc"\r\n"","0",""');
  assert.equal(csvResult({ columns: ['id','name'], values: [] }), '"id","name"');
});

test('the privacy scenario blocks CSV even when identifier columns use aliases', () => {
  assert.throws(() => csvResult({ columns: ['innocent_alias'], values: [['16442684']] }, { allowExport: false }), /privacy scenario/);
});
