import {importHistorical} from './historical.mjs';
export function assessReasoning(ticket,scenario,resolution){
 const fields=['cause','action','validation','communication','followup'];const feedback=[];let score=0;
 const tokens=v=>new Set(String(v||'').toLowerCase().match(/[a-z0-9-]{4,}/g)||[]);
 const evidence=tokens(Object.values(scenario.evidence).join(' '));
 for(const key of fields){const text=String(resolution[key]||'').trim(),words=text.split(/\s+/);let points=0;
 if(words.length>=8)points+=3;else feedback.push(key+': explain the step in a complete sentence.');
 if(new Set(words.map(w=>w.toLowerCase())).size>=6)points+=2;
 if(key==='cause'&&[...tokens(text)].some(w=>evidence.has(w)))points+=5;
 else if(key==='validation'&&/verif|retest|confirm|compar|count|replay|status|check/i.test(text))points+=5;
 else if(key==='action'&&/approv|authoriz|escalat|route|map|unlock|refresh|rollback|reconnect/i.test(text))points+=5;
 else if(key==='communication'&&/user|requester|clinician|nurse|doctor|team/i.test(text))points+=5;
 else if(key==='followup'&&/monitor|prevent|review|follow|owner|track|escalat/i.test(text))points+=5;
 else feedback.push(key+': tie your explanation to the evidence and the next responsible step.');score+=points;}
 if(/\b(delete all|grant unrestricted|bypass approval)\b/i.test(Object.values(resolution).join(' '))){score=Math.max(0,score-20);feedback.push('Unsafe action language requires review.');}
 const causeTokens=tokens(resolution.cause); const specific=[...evidence].filter(w=>!['with','from','this','that','have','only','must','user','before','after'].includes(w)); const matched=specific.filter(w=>causeTokens.has(w)); if(matched.length<3){score=Math.min(score,30);feedback.push('Diagnosis: cite at least three scenario evidence details; generic explanations do not establish the cause.');} if(ticket.evidence?.length<3){score=Math.min(score,25);feedback.push('Inspect caller, logs and configuration evidence before concluding.');} return {evidenceMatched:matched,score,max:50,feedback,label:'Rule-based writing feedback; mentor review recommended'};
}
export function chartCommand(s,p,apply){
 const pt=s.patients.find(x=>x.id===p.patient);if(!pt)throw Error('Patient not found');
 const e=s.encounters.find(x=>x.patient===pt.id&&['Admitted','In progress'].includes(x.status));
 const need=()=>{if(!e)throw Error('Select an active encounter in the clinical workspace');return e.id};
 const run=(a,payload)=>apply(s,a,payload);
 if(p.command==='initialize')return importHistorical(s,pt.id);
 if(p.command==='notesRead'){if(!['Nurse','Resident','Attending'].includes(s.role))throw Error('Clinical role required');for(const n of s.notes.filter(n=>n.patient===pt.id))n.reviewedAt=new Date().toISOString();return s;}
 if(['correctResult','reviewResult'].includes(p.command)){if(!s.results.some(r=>r.id===p.id&&r.patient===pt.id))throw Error('Result association mismatch');return run(p.command,{id:p.id,value:p.value,reason:p.reason,note:p.note});}
 if(p.command==='list')return run('list',{patient:pt.id,add:p.add});
 if(p.command==='draft'){if(!['Nurse','Resident','Attending'].includes(s.role))throw Error('Clinical role required');s.chartDrafts??={};s.chartDrafts[pt.id]={sharedId:s.chartDrafts[pt.id]?.sharedId,body:String(p.body||'').slice(0,12000),type:p.type||'H&P',cosigner:p.cosigner||'',at:new Date().toISOString()};return s;}
 if(p.command==='discard'){if(!['Nurse','Resident','Attending'].includes(s.role))throw Error('Clinical role required');s.chartDrafts??={};delete s.chartDrafts[pt.id];return s;}
 if(p.command==='note'){if(p.id&&!s.notes.some(n=>n.id===p.id&&n.patient===pt.id))throw Error('Note association mismatch');let n=p.id&&s.notes.find(x=>x.id===p.id&&x.patient===pt.id);if(n){s=apply(s,'editNote',{id:n.id,body:p.body});if(p.sign)s=apply(s,'signNote',{id:n.id});return s}s=run('note',{encounter:need(),body:p.body,type:p.type||'H&P',cosigner:p.cosigner,sign:!!p.sign});s.chartDrafts??={};s.chartDrafts[pt.id]={body:p.body,type:p.type||'H&P',cosigner:p.cosigner||'',sharedId:s.notes.at(-1).id};return s;}
 if(p.command==='order')return run('order',{encounter:need(),kind:p.kind||'Lab',name:p.name,instructions:p.instructions||'Scenario instructions pending review'});
 if(p.command==='cancelOrder'){if(!s.orders.some(o=>o.id===p.id&&o.patient===pt.id))throw Error('Order association mismatch');return run('orderStatus',{id:p.id,status:'Cancelled'});}
 if(p.command==='fluid')return run('observation',{encounter:need(),type:p.kind,value:String(p.value)+' mL'});
 if(p.command==='review'){for(const r of s.results.filter(r=>r.patient===pt.id&&!r.reviewed))s=apply(s,'reviewResult',{id:r.id,note:'Reviewed from original chart; follow-up documented by '+s.role});return s;}
 if(p.command==='handoff')return run('communicate',{patient:pt.id,destination:'Internal',recipient:'Care team',body:p.body});
 if(p.command==='team'){if(!['Nurse','Resident','Attending'].includes(s.role))throw Error('Clinical role required');s.careTeams??={};s.careTeams[pt.id]=p.join?s.role:'';return s;}
 if(['cosign','addendum','signNote','deleteNote','routeNote'].includes(p.command)&&!s.notes.some(n=>n.id===p.id&&n.patient===pt.id))throw Error('Note association mismatch');
 if(p.command==='signNote')return run('signNote',{id:p.id});
 if(p.command==='deleteNote'){const n=s.notes.find(n=>n.id===p.id);if(n.author!==s.role||!['Draft','Pended'].includes(n.status))throw Error('Only the author may remove an unsigned draft');s.notes=s.notes.filter(n=>n.id!==p.id);s.chartDrafts??={};delete s.chartDrafts[pt.id];return s;}
 if(p.command==='routeNote')return run('communicate',{patient:pt.id,destination:'Internal',recipient:'Attending review queue',body:'Please review shared note '+p.id});
 if(p.command==='cosign')return run('cosign',{id:p.id});
 if(p.command==='addendum')return run('addendum',{id:p.id,body:p.body});
 throw Error('Unsupported chart command');
}
