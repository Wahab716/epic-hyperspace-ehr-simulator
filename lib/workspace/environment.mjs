import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export function workspaceDirectory(env = process.env) {
  if (env.WORKSPACE_DATA_DIR) return resolve(env.WORKSPACE_DATA_DIR);
  return env.VERCEL === '1' ? resolve(tmpdir(), 'epic-hyperspace') : resolve('.data');
}
export function workspaceAuthMode(env = process.env) {
  return env.WORKSPACE_AUTH_MODE || (env.VERCEL === '1' ? 'demo' : 'local');
}
