'use client';
import { useState } from 'react';
import { csvResult } from '../../public/sql-results.mjs';

export default function AnalyticsPanels({ d, mode, view, action, form, table, busy }) {
  const s = d.state;
  const [sql, setSql] = useState('SELECT status, COUNT(*) AS total FROM encounters GROUP BY status;');
  const [result, setResult] = useState(null);
  const [exercise, setExercise] = useState('SQL-1');
  const [running, setRunning] = useState(false);
  async function query(grade = false) {
    if (!['Reporting Analyst', 'Application Analyst'].includes(s.role)) { setResult({ error: 'Switch to Reporting Analyst to run SQL.' }); return; }
    if (!s.pipeline.snapshot) { setResult({ error: 'Refresh the SQL snapshot first.' }); return; }
    setRunning(true); setResult(null);
    const worker = new Worker('/sql-worker.js');
    let settled = false;
    const finish = () => { if (settled) return false; settled = true; clearTimeout(timer); worker.terminate(); return true; };
    const fail = async message => {
      if (!finish()) return;
      setResult({ error: message });
      try { await action('queryHistory', { sql, outcome: message }); }
      finally { setRunning(false); }
    };
    const timer = setTimeout(() => fail('Query exceeded 5 seconds. Narrow the query.'), 5000);
    worker.onerror = () => fail('SQL worker could not load.');
    worker.onmessage = async event => {
      if (!finish()) return;
      setResult(event.data);
      try {
        await action('queryHistory', { sql, outcome: event.data.error || 'Returned ' + event.data.values.length + ' rows' });
        if (event.data.assessment) await action('exerciseResult', { id: exercise, passed: event.data.assessment.passed });
      } finally { setRunning(false); }
    };
    worker.postMessage({ sql, tables: s.pipeline.snapshot, exercise: grade ? exercise : null });
  }
  function downloadCsv() {
    try {
      const csv = csvResult(result, { allowExport: s.system.exportIdentifiers });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'query-results.csv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setResult({ error: error.message }); }
  }
  if (mode !== 'Analytics' || view !== 'SQL workspace') return null;
  return <>
    <div className="actions"><button disabled={busy || running} onClick={() => action('refresh')}>Refresh SQL snapshot</button><span>{s.pipeline.status} · {s.pipeline.refreshed || 'Never refreshed'}</span></div>
    <div className="split">
      <section><h3>Synthetic schema</h3><p>One patient can have many encounters. Orders and results can multiply joined rows; choose the right counting grain.</p>
        {Object.entries(d.schema).map(([name, columns]) => <details key={name}><summary>{name} ({s.pipeline.snapshot?.[name]?.length || 0})</summary>{Object.entries(columns).map(([column, type]) => <p key={column}><code>{column}</code> · {type}</p>)}</details>)}
      </section>
      <section><h3>SQL workbench</h3><p>Real SQLite engine · read-only snapshot · one query · 2,000-row limit · 5-second limit</p>
        <select aria-label="SQL exercise" disabled={running} value={exercise} onChange={event => setExercise(event.target.value)}>{d.exercises.map(item => <option key={item.id} value={item.id}>{item.id}: {item.title}</option>)}</select>
        <p>{d.exercises.find(item => item.id === exercise)?.prompt}</p>
        <textarea aria-label="SQL editor" className="sql" value={sql} onChange={event => setSql(event.target.value)} />
        <div className="actions"><button className="primary" disabled={running || busy} onClick={() => query()}>Run SQL</button><button disabled={running || busy} onClick={() => query(true)}>Check exercise</button><button disabled={running || busy} onClick={() => form('Save query', 'saveQuery', [['name', 'Query name']], { sql })}>Save query</button>{result?.values && <button disabled={!s.system.exportIdentifiers} onClick={downloadCsv}>Export CSV</button>}</div>
        {!s.system.exportIdentifiers && <p className="callout">CSV export is disabled by the privacy scenario.</p>}
        {result?.error && <p role="alert" className="error">{result.error}</p>}
        {result?.assessment && <p className="callout">{result.assessment.count}/{result.assessment.total} datasets passed<br />{result.assessment.feedback.join(' · ')}<br />Self-practice assessment; client-side tests are inspectable.</p>}
        {result?.columns && <div className="scroll"><table aria-label="SQL results"><thead><tr>{result.columns.map((name, index) => <th key={index}>{name}</th>)}</tr></thead><tbody>{result.values.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{String(value ?? 'NULL')}</td>)}</tr>)}</tbody></table>{result.values.length === 0 && <p className="empty">No rows returned.</p>}</div>}
        <h3>Saved queries</h3>{s.queries.map(item => <button key={item.id} onClick={() => setSql(item.sql)}>{item.name}</button>)}
        <details><summary>Query history</summary>{table(s.queryHistory, ['at', 'sql', 'outcome'], item => <button onClick={() => setSql(item.sql)}>Load</button>)}</details>
      </section>
    </div>
  </>;
}
