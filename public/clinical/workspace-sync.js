/* global state, persist, action, render, toast */
import { normalizeClinical } from './workspace-state.mjs';

const status = document.getElementById('workspace-sync');
const metaKey = 'hyperspace-sync-v1';
let version = null, workspaceId = null, dirty = false, changes = 0;
let saving = false, conflict = false, ready = false, timer;
const localPersist = persist;
const localAction = action;
const snapshot = () => normalizeClinical(state);
function metadata() { try { return JSON.parse(sessionStorage.getItem(metaKey) || '{}') || {}; } catch { return {}; } }
function remember() {
  if (version === null || !workspaceId) return;
  try { sessionStorage.setItem(metaKey, JSON.stringify({ version, workspaceId, dirty, conflict, snapshot: dirty ? snapshot() : null })); } catch { /* Browser copy is best-effort. */ }
}
function button(label, handler) {
  const element = document.createElement('button');
  element.type = 'button'; element.textContent = label;
  element.addEventListener('click', handler);
  status.append(element);
}
function show(message, problem = false) {
  status.textContent = message;
  status.dataset.problem = String(problem);
  if (problem) {
    button('Download browser backup', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'clinical-workspace-backup.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    button(conflict ? 'Load saved copy (replace tab edits)' : 'Retry saving', () => conflict ? load(true) : load(false));
  }
}
async function request(method = 'GET', command) {
  const response = await fetch('/api/workspace', {
    method, cache: 'no-store', credentials: 'same-origin',
    ...(command ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Workspace request failed');
    error.status = response.status; throw error;
  }
  return data;
}
function restore(clinical) {
  Object.assign(state, normalizeClinical(clinical), {
    view: 'list', tab: 'Summary', category: 'All', side: 'note',
    details: false, search: '', stickyOpen: false, localNote: null,
    noteFilter: 'All Notes', selectedNote: 1,
  });
  document.querySelector('.sticky')?.remove();
  document.getElementById('overlay').innerHTML = '';
  localPersist(); render();
}
function failed(error) {
  conflict = error.status === 409;
  remember();
  show(conflict
    ? 'Another tab changed this workspace. Your edits are kept in this tab; back them up before loading the saved copy.'
    : 'Saving unavailable. Your browser copy is retained. ' + error.message, true);
}
async function flush() {
  clearTimeout(timer);
  if (!ready || saving || conflict || !dirty) return;
  saving = true;
  try {
    while (dirty && !conflict) {
      const revision = changes;
      const payload = snapshot();
      show('Saving practice work…');
      const result = await request('POST', { version, action: 'clinical', payload });
      version = result.version;
      if (changes === revision) dirty = false;
      remember();
    }
    show('Saved to this computer · revision ' + version);
  } catch (error) { failed(error); }
  finally { saving = false; }
}
async function load(discard = false) {
  if (saving) return;
  const app = document.getElementById('app');
  app.inert = true;
  show('Loading saved practice workspace…');
  try {
    const previous = metadata();
    const remote = await request();
    workspaceId = remote.workspaceId; version = remote.version; conflict = false; ready = true;
    const unsaved = !discard && previous.dirty && previous.workspaceId === workspaceId;
    if (unsaved && previous.snapshot) restore(previous.snapshot);
    if (unsaved && (previous.conflict || previous.version !== version) && remote.state.clinical !== null) {
      dirty = true; version = previous.version;
      const error = new Error('The saved copy changed'); error.status = 409; failed(error); return;
    }
    if (!discard && (unsaved || remote.state.clinical === null)) {
      dirty = true; changes++; remember(); await flush();
    } else {
      restore(remote.state.clinical || {}); dirty = false; remember();
      show('Saved to this computer · revision ' + version);
    }
  } catch (error) { failed(error); }
  finally { app.inert = false; }
}
persist = function () {
  localPersist(); dirty = true; changes++; remember();
  if (conflict) return;
  show('Unsaved changes · saving soon…');
  clearTimeout(timer); timer = setTimeout(flush, 350);
};
action = function (command) {
  if (command !== 'confirm-reset') return localAction(command);
  if (saving || conflict || !ready) { toast('Finish saving or load the saved copy before resetting.'); return; }
  clearTimeout(timer);
  saving = true;
  document.getElementById('app').inert = true;
  return request('POST', { version, action: 'reset' }).then(result => {
    version = result.version; dirty = false; conflict = false;
    restore(result.state.clinical); remember(); show('Practice reset and saved · revision ' + version);
  }).catch(failed).finally(() => { saving = false; document.getElementById('app').inert = false; });
};
load();
