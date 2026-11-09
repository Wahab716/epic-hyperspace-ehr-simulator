// Preserve SQLite's ordered columns, including duplicate names and empty result sets.
export function csvResult(result, { allowExport = true } = {}) {
  if (!allowExport) throw new Error('CSV export is disabled by the privacy scenario.');
  const cell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  return [result.columns.map(cell).join(','), ...result.values.map(row => row.map(cell).join(','))].join('\r\n');
}
