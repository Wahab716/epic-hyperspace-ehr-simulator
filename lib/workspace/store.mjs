import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function createWorkspaceStore(filename = resolve(process.env.WORKSPACE_DATA_DIR || '.data', 'workspaces.sqlite')) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(resolve('db/migrations/0001_workspaces.sql'), 'utf8'));
  const select = db.prepare('SELECT data, version FROM workspaces WHERE owner = ?');
  const insert = db.prepare('INSERT OR IGNORE INTO workspaces (owner, data, version, updated_at) VALUES (?, ?, 1, ?)');
  const update = db.prepare('UPDATE workspaces SET data = ?, version = version + 1, updated_at = ? WHERE owner = ? AND version = ?');
  return {
    load(owner) {
      insert.run(owner, JSON.stringify({ schemaVersion: 1, role: 'Clinician', clinical: null }), new Date().toISOString());
      const row = select.get(owner);
      return { state: JSON.parse(row.data), version: row.version };
    },
    save(owner, version, state) {
      const result = update.run(JSON.stringify(state), new Date().toISOString(), owner, version);
      if (result.changes !== 1) return null;
      return { state, version: version + 1 };
    },
    close() { db.close(); },
  };
}
let store;
export function getWorkspaceStore() { return store ??= createWorkspaceStore(); }
