import { workspaceAuthMode } from './environment.mjs';
import { trainingSummary, trainingWorkspace, trainingExport } from './training.mjs';
import { reportingSummary } from './reporting.mjs';
import { processWorkspaceJobs } from './jobs.mjs';
import { authenticate, workspaceId } from './auth.mjs';
import { cases, schema, exercises } from '../training/catalog.mjs';
import { seed as hospitalSeed } from '../training/domain.mjs';
import { hospitalFor, applyWorkflow, importChart, chartFromHospital, practiceRoles } from './workflows.mjs';
import { normalizeClinical } from '../../public/clinical/workspace-state.mjs';

export function createWorkspaceHandlers(store, authOptions) {
  async function handle(request) {
    let identity;
    const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...(identity?.cookie ? { 'Set-Cookie': identity.cookie } : {}) } });
    try { identity = authenticate(request, authOptions); }
    catch { return reply({ error: 'Authentication required. Use localhost for local practice or configure the trusted proxy.' }, 401); }
    const output = row => {
      const hospital = hospitalFor(row.state);
      const { trainingSnapshots, ...state } = row.state;
      return { storageMode: process.env.VERCEL === '1' ? 'temporary-demo' : 'persistent-local', authMode: workspaceAuthMode(), version: row.version, state: { ...state, hospital }, training: trainingSummary(hospital), trainingExport: trainingExport(hospital), snapshots: (trainingSnapshots || []).map(({ state, ...meta }) => { void state; return meta; }), reporting: reportingSummary(hospital), workspaceId: workspaceId(identity.owner), roles: practiceRoles, schema, exercises: exercises.map(({ solution, ...exercise }) => { void solution; return exercise; }), cases: cases.map(({ fix, ...scenario }) => { void fix; return scenario; }) };
    };
    try {
      const row = store.load(identity.owner);
      if (request.method === 'GET') return reply(output(processWorkspaceJobs(store, identity.owner)));
      if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
      const origin = request.headers.get('origin');
      if (origin) {
        const target = new URL(request.url);
        let source;
        try { source = new URL(origin); } catch { return reply({ error: 'Origin mismatch' }, 403); }
        const loopback = host => ['localhost','127.0.0.1','[::1]'].includes(host);
        const localAlias = loopback(source.hostname) && loopback(target.hostname) && source.protocol === target.protocol && source.port === target.port;
        if (source.origin !== target.origin && !localAlias) return reply({ error: 'Origin mismatch' }, 403);
      }
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
          const payload = envelope.payload || {};
          if (typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid workflow payload');
          const trainingState = trainingWorkspace(row.state, envelope.action, payload);
          if (trainingState) state = trainingState;
          else {
            const hospital = applyWorkflow(hospitalFor(row.state), envelope.action, payload);
            state = { ...row.state, hospital, clinical: chartFromHospital(row.state.clinical, hospital) };
          }
        } else {
          const clinical = normalizeClinical(command.action === 'reset' ? {} : command.payload);
          const hospital = command.action === 'reset' ? hospitalSeed() : importChart(hospitalFor(row.state), clinical, row.state.clinical);
          state = { ...row.state, clinical, hospital };
        }
      } catch (error) { return reply({ error: error.message }, 400); }
      if (Buffer.byteLength(JSON.stringify(state)) > 1500 * 1024) return reply({ error: 'Workspace snapshot capacity reached. Export your practice results and delete an older snapshot before retrying.' }, 413);
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
