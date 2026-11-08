// Stable chart data shared by the browser and workspace API. UI state is transient.
export const patientIds = ['16442684','16440285','16440288','16440292','16440295','16440297','16440300','9301254'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function text(value, fallback = '', limit = 100000) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > limit) throw new Error('Invalid or oversized chart text');
  return value;
}
function list(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 2000) throw new Error('Invalid chart collection');
  return value;
}
function dictionary(value, convert) {
  if (value === undefined) return {};
  if (!object(value) || Object.keys(value).length > patientIds.length) throw new Error('Invalid patient dictionary');
  return Object.fromEntries(Object.entries(value).map(([id, entry]) => {
    if (!patientIds.includes(id)) throw new Error('Unknown patient');
    return [id, convert(entry)];
  }));
}
function patientRecord(value) {
  if (!object(value) || !patientIds.includes(value.mrn)) throw new Error('Invalid patient record');
  return value;
}
function note(value) {
  if (!object(value)) throw new Error('Invalid note');
  const result = { body: text(value.body), type: text(value.type, 'H&P', 100), cosigner: text(value.cosigner, '', 200), status: text(value.status, 'Draft', 100) };
  if (Number.isSafeInteger(value.savedIndex) && value.savedIndex >= 0) result.savedIndex = value.savedIndex;
  return result;
}
export function normalizeClinical(value = {}) {
  if (!object(value)) throw new Error('Invalid clinical workspace');
  const members = value.members === undefined ? [0,1,2,3,4,5,6] : list(value.members);
  if (!members.every(index => Number.isInteger(index) && index >= 0 && index < patientIds.length)) throw new Error('Invalid patient list');
  return {
    patient: Number.isInteger(value.patient) && value.patient >= 0 && value.patient < patientIds.length ? value.patient : 0,
    members: [...new Set(members)],
    stickies: dictionary(value.stickies, entry => text(entry)),
    drafts: dictionary(value.drafts, note),
    notes: list(value.notes).map(entry => ({ ...note(patientRecord(entry)), mrn: entry.mrn, date: text(entry.date, '', 100) })),
    orders: list(value.orders).map(entry => {
      patientRecord(entry);
      if (!['Active','Discontinued'].includes(entry.status)) throw new Error('Invalid order status');
      return { mrn: entry.mrn, name: text(entry.name, '', 500), detail: text(entry.detail, '', 2000), status: entry.status };
    }),
    fluids: list(value.fluids).map(entry => {
      patientRecord(entry);
      if (!Number.isFinite(entry.value) || entry.value <= 0 || !['Intake','Output'].includes(entry.type)) throw new Error('Invalid measurement');
      return { mrn: entry.mrn, date: text(entry.date, '', 100), type: entry.type, value: entry.value };
    }),
    resultsReviewed: dictionary(value.resultsReviewed, entry => entry === true),
    notesReviewed: dictionary(value.notesReviewed, entry => entry === true),
    handoff: text(value.handoff),
  };
}
