import { createWorkspaceStore } from '../lib/workspace/store.mjs';
import { processWorkspaceJobs } from '../lib/workspace/jobs.mjs';
const store = createWorkspaceStore();
function tick() {
  for (const owner of store.owners()) {
    try { processWorkspaceJobs(store, owner); }
    catch (error) { console.error('Reporting worker:', error.message); }
  }
}
tick();
const timer = setInterval(tick, 5000);
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { clearInterval(timer); store.close(); process.exit(0); });
console.log('Reporting worker active. Checks queued and hourly jobs every 5 seconds.');
