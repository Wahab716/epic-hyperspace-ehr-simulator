import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceStore } from '../lib/workspace/store.mjs';
import { createWorkspaceHandlers } from '../lib/workspace/service.mjs';
import { applyWorkflow, hospitalFor } from '../lib/workspace/workflows.mjs';
import { trainingExport, trainingMarkdown } from '../lib/workspace/training.mjs';
import { buildReports } from '../lib/training/reports.mjs';
import { reportMetadata } from '../lib/training/report-metadata.mjs';

test('detailed reports retain metadata for every original population', () => {
  const s=applyWorkflow(applyWorkflow(hospitalFor({}),'role',{role:'Reporting Analyst'}),'refresh');
  assert.deepEqual(Object.keys(buildReports(s.pipeline.snapshot)).sort(),Object.keys(reportMetadata).sort());
  assert.equal(Object.keys(reportMetadata).length,11);
  for(const metadata of Object.values(reportMetadata))for(const key of ['grain','population','time','exclusions','filters'])assert.ok(metadata[key]);
});
test('general portfolio artifacts persist in both evidence export formats', () => {
  const s=applyWorkflow(hospitalFor({}),'artifact',{type:'Test plan',title:'Interface negative test',body:'Compare a wrong-encounter message and verify quarantine without creating a clinical result.'});
  const exported=trainingExport(s);assert.equal(exported.documents[0].type,'Test plan');assert.match(trainingMarkdown(exported),/Interface negative test/);
  assert.throws(()=>applyWorkflow(s,'artifact',{type:'Test plan',title:'',body:'Missing title'}),/required/);
});
test('one API response uses one initial hospital seed; snapshot bodies remain server-side', async t => {
  const store=createWorkspaceStore(':memory:');t.after(()=>store.close());const api=createWorkspaceHandlers(store,{secret:'final-tests',mode:'local'});
  const url='http://localhost:3000/api/workspace';const r=await api.GET(new Request(url));let data=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];
  const post=(action,payload,origin='http://127.0.0.1:3000')=>api.POST(new Request(url,{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({version:data.version,action:'workflow',payload:{action,payload}})}));
  let response=await post('trainingSnapshot',{name:'Final checkpoint'});assert.equal(response.status,200);data=await response.json();
  assert.equal(data.state.trainingSnapshots,undefined);assert.equal(data.snapshots.length,1);
  assert.equal(data.snapshots[0].state,undefined);
  assert.equal((await post('trainingReset',{confirm:'RESET'},'http://localhost:3001')).status,403);
  assert.equal((await post('trainingReset',{confirm:'RESET'},'https://attacker.example')).status,403);
});
