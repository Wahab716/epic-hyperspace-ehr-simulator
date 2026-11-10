import test from 'node:test';
import assert from 'node:assert/strict';
import { hospitalFor, applyWorkflow } from '../lib/workspace/workflows.mjs';
import { trainingSummary, capstoneAssessment, trainingWorkspace, trainingExport, trainingMarkdown } from '../lib/workspace/training.mjs';
import { createWorkspaceStore } from '../lib/workspace/store.mjs';
import { createWorkspaceHandlers } from '../lib/workspace/service.mjs';

test('seven-day path requires workflow evidence beyond reflections and rejects invalid lessons', () => {
  let s = hospitalFor({});
  assert.equal(trainingSummary(s).lessons.length, 7);
  assert.ok(trainingSummary(s).lessons.every(x => !x.completed));
  for (const index of [-1, 7, '0', 1.5]) assert.throws(() => applyWorkflow(s, 'lesson', { index, reflection: 'A detailed practice reflection.' }), /Unknown/);
  assert.throws(() => applyWorkflow(s, 'lesson', { index: 0, reflection: 'short' }), /15/);
  s = applyWorkflow(s, 'lesson', { index: 0, reflection: 'I compared the patient and encounter identities.' });
  assert.equal(trainingSummary(s).lessons[0].completed, false);
  assert.equal(s.progress['DAY-0'].reflection, 'I compared the patient and encounter identities.');
});

test('capstone enforces linked evidence across clinical, interface, reporting, reflection and documentation', () => {
  let s = hospitalFor({}); const act = (a,p={}) => s = applyWorkflow(s,a,p);
  assert.throws(() => act('startCapstone'), /START/);
  act('startCapstone', { confirm: 'START' });
  assert.throws(() => act('capstonePatient', { patient: '16442684' }), /new patient/);
  act('role',{role:'Registrar'}); act('register',{name:'Capstone, Practice',dob:'1991-01-01',allergies:'Unknown'});
  const patient=s.patients.at(-1).id; act('capstonePatient',{patient});
  act('admit',{patient,unit:'E8 Med/Surg',bed:'CAP-8'}); const encounter=s.encounters.at(-1).id;
  act('role',{role:'Attending'}); act('order',{encounter,kind:'Lab',name:'Capstone potassium',instructions:'Synthetic test'});
  const order=s.orders.at(-1).id;act('orderStatus',{id:order,status:'Signed'});
  act('role',{role:'Nurse'});act('orderStatus',{id:order,status:'Collected'});
  const specimen=s.specimens.at(-1).id;act('specimen',{id:specimen,status:'Received'});act('specimen',{id:specimen,status:'Processing'});
  assert.ok(capstoneAssessment(s).score < 100);
  act('role',{role:'Application Analyst'});act('enqueue',{order,control:'CAP-CONTROL',code:'CAP_LOCAL',value:'6.4'});
  const message=s.messages.at(-1).id;act('replay',{id:message});assert.equal(s.messages.at(-1).status,'Rejected');
  act('mapping',{code:'CAP_LOCAL',target:'2823-3'});act('replay',{id:message});act('replay',{id:message});
  assert.equal(s.results.filter(x=>x.message==='CAP-CONTROL').length,1);
  act('role',{role:'Attending'});act('reviewResult',{id:s.results.at(-1).id,note:'Verified synthetic critical result and contacted the practice team.'});
  act('role',{role:'Reporting Analyst'});act('refresh');
  act('capstoneDocument',Object.fromEntries(['scope','cause','action','validation','followup'].map(k=>[k,'Documented '+k+' with the patient, encounter, control ID and supporting evidence.'])));
  act('lesson',{index:6,reflection:'I verified one result after replay and compared the reporting extract.'});
  assert.equal(capstoneAssessment(s).score,100);assert.equal(trainingSummary(s).lessons[6].completed,true);
  const exported=trainingExport(s);assert.equal(exported.assessment.capstone.passed,true);
  assert.match(trainingMarkdown(exported),/Score: 100\/100/);assert.equal(exported.documents.length,1);assert.equal(exported.patients,undefined);
  // A result from another encounter cannot satisfy the linked pipeline criterion.
  const broken=structuredClone(s);broken.results[0].encounter='ENC-other';assert.ok(capstoneAssessment(broken).score<100);
  act('startCapstone',{confirm:'START'});assert.equal(capstoneAssessment(s).passed,false);assert.equal(s.progress['DAY-6'],undefined);
});

test('snapshots restore the full chart and training state, retain snapshots, and disable hourly schedules', () => {
  let state={clinical:{handoff:'Original chart'},hospital:hospitalFor({})};
  state.hospital.reportingSchedule={enabled:true,nextRun:new Date().toISOString()};
  state=trainingWorkspace(state,'trainingSnapshot',{name:'Before exercise'});const id=state.trainingSnapshots[0].id;
  state.clinical.handoff='Changed chart';state.hospital.patients.pop();
  assert.throws(()=>trainingWorkspace(state,'trainingRestore',{id}),/RESTORE/);
  state=trainingWorkspace(state,'trainingRestore',{id,confirm:'RESTORE'});
  assert.equal(state.clinical.handoff,'Original chart');assert.equal(state.hospital.reportingSchedule.enabled,false);
  assert.equal(state.trainingSnapshots.length,1);assert.equal(state.trainingSnapshots[0].state.trainingSnapshots,undefined);
  state=trainingWorkspace(state,'trainingSnapshot',{name:'Second'});state=trainingWorkspace(state,'trainingSnapshot',{name:'Third'});
  assert.throws(()=>trainingWorkspace(state,'trainingSnapshot',{name:'Fourth'}),/Three/);
  assert.throws(()=>trainingWorkspace(state,'trainingReset',{}),/RESET/);
  state=trainingWorkspace(state,'trainingReset',{confirm:'RESET'});assert.equal(state.trainingSnapshots.length,3);assert.equal(state.hospital.capstone,undefined);
  state=trainingWorkspace(state,'trainingDeleteSnapshot',{id});assert.equal(state.trainingSnapshots.length,2);
});

test('versioned API persists reflections and full snapshots; stale restore cannot overwrite another session or save', async t => {
  const store=createWorkspaceStore(':memory:');t.after(()=>store.close());const api=createWorkspaceHandlers(store,{secret:'training-tests',mode:'local'});
  const url='http://localhost:3000/api/workspace';const open=async cookie=>{const r=await api.GET(new Request(url,{headers:cookie?{cookie}:{}}));return {data:await r.json(),cookie:cookie||r.headers.get('set-cookie').split(';')[0]};};
  const session=await open(),other=await open();let data=session.data;
  const post=async(action,payload,version=data.version)=>api.POST(new Request(url,{method:'POST',headers:{cookie:session.cookie,origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({version,action:'workflow',payload:{action,payload}})}));
  let r=await post('lesson',{index:0,reflection:'I verified saved workflow evidence before reporting completion.'});assert.equal(r.status,200);data=await r.json();
  r=await post('trainingSnapshot',{name:'First'});assert.equal(r.status,200);data=await r.json();const id=data.snapshots[0].id,version=data.version;
  r=await post('trainingReset',{confirm:'RESET'});assert.equal(r.status,200);data=await r.json();assert.equal(data.training.lessons[0].reflection,'');
  assert.equal((await post('trainingRestore',{id,confirm:'RESTORE'},version)).status,409);
  r=await post('trainingRestore',{id,confirm:'RESTORE'});assert.equal(r.status,200);data=await r.json();assert.match(data.training.lessons[0].reflection,/verified/);
  assert.equal((await open(other.cookie)).data.snapshots.length,0);
  assert.equal(data.snapshots[0].state,undefined);assert.equal(data.trainingExport.assessment.lessons.length,7);
});
