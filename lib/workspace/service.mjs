import { authenticate, workspaceId } from './auth.mjs';
import { seed as hospitalSeed } from '../training/domain.mjs';
import { hospitalFor, applyWorkflow, importChart, chartFromHospital, clinicalRoles } from './workflows.mjs';
import { normalizeClinical } from '../../public/clinical/workspace-state.mjs';

export function createWorkspaceHandlers(store, authOptions) {
  async function handle(request) {
    let identity;
    const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...(identity?.cookie ? { 'Set-Cookie': identity.cookie } : {}) } });
    try { identity = authenticate(request, authOptions); }
    catch { return reply({ error: 'Authentication required. Use localhost for local practice or configure the trusted proxy.' }, 401); }
    const output = row => ({ ...row, state: { ...row.state, hospital: hospitalFor(row.state) }, workspaceId: workspaceId(identity.owner), roles: clinicalRoles });
    try {
      const row = store.load(identity.owner);
      if (request.method === 'GET') return reply(output(row));
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Origin mismatch' }, 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Expected JSON' }, 415);
      const body = await request.text();
      if (Buffer.byteLength(body) > 2 * 1024 * 1024) return reply({ error: 'Workspace is too large' }, 413);
      let command;
      try { command = JSON.parse(body); } catch { return reply({ error: 'Invalid JSON' }, 400); }
      if (!command || !Number.isSafeInteger(command.version) || command.version < 1) return reply({ error: 'A workspace version is required' }, 400);
      if (command.version !== row.version) return reply({ error: 'Concurrent update; reload the saved workspace before retrying' }, 409);
      if (identity.role !== 'Clinician') return reply({ error: 'Role cannot edit clinical records' }, 403);
      if (!['clinical', 'reset', 'workflow'].includes(command.action)) return reply({ error: 'Unsupported workspace action' }, 400);
      if (command.action === 'clinical' && (!command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload))) return reply({ error: 'A clinical snapshot is required' }, 400);
      let state;
      try {
        if (command.action === 'workflow') {
          const envelope = command.payload;
          if (!envelope || typeof envelope.action !== 'string') throw new Error('A workflow action is required');
          const hospital = applyWorkflow(hospitalFor(row.state), envelope.action, envelope.payload);
          state = { ...row.state, hospital, clinical: chartFromHospital(row.state.clinical, hospital) };
        } else {
          const clinical = normalizeClinical(command.action === 'reset' ? {} : command.payload);
          const hospital = command.action === 'reset' ? hospitalSeed() : importChart(hospitalFor(row.state), clinical, row.state.clinical);
          state = { ...row.state, clinical, hospital };
        }
      } catch (error) { return reply({ error: error.message }, 400); }
      const saved = store.save(identity.owner, command.version, state);
      if (!saved) return reply({ error: 'Concurrent update; reload the saved workspace before retrying' }, 409);
      return reply(output(saved));
    } catch (error) {
      console.error('Workspace storage error:', error.message);
      return reply({ error: 'Workspace storage unavailable. Your browser copy is retained.' }, 503);
    }
  }
  return { GET: handle, POST: handle };
}
