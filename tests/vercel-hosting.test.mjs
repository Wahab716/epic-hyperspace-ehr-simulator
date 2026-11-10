import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { workspaceDirectory, workspaceAuthMode } from '../lib/workspace/environment.mjs';
import { authenticate } from '../lib/workspace/auth.mjs';
import { createWorkspaceStore } from '../lib/workspace/store.mjs';
import { createWorkspaceHandlers } from '../lib/workspace/service.mjs';
test('Vercel uses temporary storage; local and explicit paths stay unchanged',()=>{
 assert.equal(workspaceDirectory({VERCEL:'1'}),resolve(tmpdir(),'epic-hyperspace'));
 assert.equal(workspaceDirectory({}),resolve('.data'));
 assert.equal(workspaceDirectory({VERCEL:'1',WORKSPACE_DATA_DIR:'/custom'}),'/custom');
 assert.equal(workspaceAuthMode({VERCEL:'1'}),'demo');assert.equal(workspaceAuthMode({}),'local');
 assert.equal(workspaceAuthMode({VERCEL:'1',WORKSPACE_AUTH_MODE:'trusted-proxy'}),'trusted-proxy');
});
test('hosted demo cookies are signed, secure and isolated; local-only mode rejects remote hosts',()=>{
 const url='https://ehr-demo.vercel.app/api/workspace',options={mode:'demo',secret:'stable-demo-test-secret'};
 const a=authenticate(new Request(url),options),b=authenticate(new Request(url),options);
 assert.notEqual(a.owner,b.owner);assert.match(a.cookie,/; Secure/);
 const cookie=a.cookie.split(';')[0];assert.equal(authenticate(new Request(url,{headers:{cookie}}),options).owner,a.owner);
 assert.throws(()=>authenticate(new Request(url),{...options,mode:'local'}),/localhost/);
 assert.notEqual(authenticate(new Request(url,{headers:{cookie}}),{...options,secret:'different-secret'}).owner,a.owner);
});
test('deployed-host API accepts saved workflows while separating demo sessions',async t=>{
 const store=createWorkspaceStore(':memory:');t.after(()=>store.close());const api=createWorkspaceHandlers(store,{mode:'demo',secret:'stable-demo-test-secret'});
 const url='https://ehr-demo.vercel.app/api/workspace';let r=await api.GET(new Request(url));assert.equal(r.status,200);let d=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];
 r=await api.POST(new Request(url,{method:'POST',headers:{cookie,origin:'https://ehr-demo.vercel.app','content-type':'application/json'},body:JSON.stringify({version:d.version,action:'workflow',payload:{action:'lesson',payload:{index:0,reflection:'Verified hosted-demo writes and session isolation.'}}})}));
 assert.equal(r.status,200);d=await r.json();assert.match(d.training.lessons[0].reflection,/hosted-demo/);
 const other=await api.GET(new Request(url));assert.equal((await other.json()).training.lessons[0].reflection,'');
});
