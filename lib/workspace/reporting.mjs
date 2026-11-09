import { tables } from '../training/domain.mjs';

export const reportDefinitions = [
  { id: 'census', title: 'Active census', grain: 'Distinct admitted encounter', population: 'status = Admitted', table: 'encounters', metric: rows => new Set(rows.filter(x => x.status === 'Admitted').map(x => x.id)).size },
  { id: 'visits', title: 'Encounter volume', grain: 'Distinct encounter', population: 'Exclude cancelled encounters', table: 'encounters', metric: rows => new Set(rows.filter(x => x.status !== 'Cancelled').map(x => x.id)).size },
  { id: 'patients', title: 'Registered patients', grain: 'Distinct patient', population: 'All registered fictional patients', table: 'patients', metric: rows => new Set(rows.map(x => x.id)).size },
  { id: 'results', title: 'Final result volume', grain: 'Distinct result', population: 'Current results, corrected versions counted once', table: 'results', metric: rows => new Set(rows.map(x => x.id)).size },
  { id: 'critical', title: 'Critical follow-up backlog', grain: 'Distinct result', population: 'Critical and not reviewed', table: 'results', metric: rows => new Set(rows.filter(x => x.critical && !x.reviewed).map(x => x.id)).size },
  { id: 'orders', title: 'Unsigned orders', grain: 'Distinct order', population: 'status = Draft', table: 'orders', metric: rows => new Set(rows.filter(x => x.status === 'Draft').map(x => x.id)).size },
  { id: 'notes', title: 'Cosign backlog', grain: 'Distinct note', population: 'status = Cosign Needed', table: 'notes', metric: rows => new Set(rows.filter(x => x.status === 'Cosign Needed').map(x => x.id)).size },
  { id: 'appointments', title: 'Scheduled appointments', grain: 'Distinct appointment', population: 'status = Scheduled', table: 'appointments', metric: rows => new Set(rows.filter(x => x.status === 'Scheduled').map(x => x.id)).size },
  { id: 'tickets', title: 'Open support tickets', grain: 'Distinct ticket', population: 'Exclude Resolved and Closed', table: 'tickets', metric: rows => new Set(rows.filter(x => !['Resolved','Closed'].includes(x.status)).map(x => x.id)).size },
  { id: 'interfaces', title: 'Interface exceptions', grain: 'Distinct message', population: 'Rejected or Quarantined', table: 'messages', metric: rows => new Set(rows.filter(x => ['Rejected','Quarantined'].includes(x.status)).map(x => x.id)).size },
  { id: 'specimens', title: 'Specimen processing backlog', grain: 'Distinct specimen', population: 'Collected, Received, or Processing', table: 'specimens', metric: rows => new Set(rows.filter(x => ['Collected','Received','Processing'].includes(x.status)).map(x => x.id)).size },
];
export function reportingSummary(s) {
  const source = tables(s);
  const reports = reportDefinitions.map(({ metric, ...definition }) => ({ ...definition,
    source: metric(source[definition.table] || []),
    extract: s.pipeline.snapshot ? metric(s.pipeline.snapshot[definition.table] || []) : null,
    cache: s.pipeline.cache ? metric(s.pipeline.cache[definition.table] || []) : null,
  }));
  const comparisons = Object.keys(source).filter(key => !['loadRuns','audit'].includes(key)).map(table => {
    const current = source[table], staging = s.pipeline.staging?.[table], extract = s.pipeline.snapshot?.[table];
    return { table, source: current.length, staging: staging?.length ?? null, extract: extract?.length ?? null,
      matchesSource: extract ? JSON.stringify(current) === JSON.stringify(extract) : false,
      duplicates: extract ? extract.length - new Set(extract.map(x => x.id)).size : null };
  });
  return { reports, comparisons, warehouse: s.pipeline.warehouse || null };
}
