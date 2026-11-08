const words=x=>new Set(String(x||'').toLowerCase().match(/[a-z0-9_-]{3,}/g)||[]);
const overlap=(text,reference)=>[...words(reference)].filter(w=>words(text).has(w));
export function scenarioAssessment(ticket,scenario,resolution){
 const definitions=[
 ['scope',15,`${scenario.complaint} ${scenario.evidence.Caller}`,`${ticket.impact||''} ${ticket.scope||''}`,3],
 ['evidence',25,Object.values(scenario.evidence).join(' '),resolution.cause,4],
 ['diagnosis',20,scenario.evidence.Logs,`${ticket.hypothesis||''} ${resolution.cause}`,3],
 ['action',20,`${scenario.action} ${scenario.evidence.Configuration}`,resolution.action,3],
 ['validation',10,scenario.verification,resolution.validation,3],
 ['documentation',10,`${scenario.requester} team follow monitor prevent`,`${resolution.communication} ${resolution.followup}`,2]
 ];
 const rubric=definitions.map(([key,max,reference,text,minimum])=>{const matches=overlap(text,reference);let earned=Math.round(Number(max)*Math.min(1,matches.length/Number(minimum)));if(key==='evidence'&&(ticket.evidence||[]).length<3)earned=Math.min(earned,10);if(key==='action'&&!ticket.fixed)earned=0;if(key==='validation'&&!ticket.verified)earned=0;return {key,max,earned,evidence:matches,expected:reference,feedback:earned===max?'Evidence supports this criterion.':`Explain ${key} using the scenario evidence: ${reference}`}});
 const unsafe=/\b(bypass|unrestricted|disable audit|delete all)\b/i.test(Object.values(resolution).join(' '));
 return {scenario:scenario.id,score:Math.max(0,rubric.reduce((n,r)=>n+r.earned,0)-(unsafe?30:0)),max:100,rubric,unsafe,label:'Transparent scenario-specific rules; self-practice assessment'};
}
