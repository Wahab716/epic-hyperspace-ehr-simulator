export function buildReports(snap,{unit='All',since='0001-01-01',until='9999-12-31'}={}){
 const start=Date.parse(since),end=Date.parse(until);if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)throw Error('Choose a valid increasing UTC date interval');
 const inWindow=v=>Number.isFinite(Date.parse(v))&&Date.parse(v)>=start&&Date.parse(v)<end;
 const hours=(a,b)=>{const n=(Date.parse(b)-Date.parse(a))/3600000;return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null};
 const encounters=snap.encounters.filter(e=>unit==='All'||e.unit===unit),active=encounters.filter(e=>e.status==='Admitted'),discharged=encounters.filter(e=>e.discharged&&inWindow(e.discharged));
 const appointments=snap.appointments.filter(a=>inWindow(a.time)&&a.status!=='Cancelled'),no=appointments.filter(a=>a.status==='No show').length;
 return {'Daily census':active,'Admissions':encounters.filter(e=>inWindow(e.admitted)),'Discharges':discharged,'Length of stay':discharged.map(e=>({encounter:e.id,days:hours(e.admitted,e.discharged)===null?null:Math.round((Date.parse(e.discharged)-Date.parse(e.admitted))/86400000*100)/100})),
 'No-show rate':[{eligible:appointments.length,noShows:no,percent:appointments.length?Math.round(10000*no/appointments.length)/100:null}],
 'Unsigned notes':snap.notes.filter(n=>['Draft','Pended'].includes(n.status)),'Outstanding cosignatures':snap.notes.filter(n=>n.status==='Cosign Needed'),
 'Orders without results':snap.orders.filter(o=>o.status!=='Cancelled'&&!snap.results.some(r=>r.order===o.id)),
 'Result turnaround':snap.results.map(r=>({result:r.id,order:r.order,hours:hours(snap.orders.find(o=>o.id===r.order)?.created,r.created)})),
 'Interface backlog':snap.messages.filter(m=>m.status!=='Acknowledged'),
 'Ticket resolution':snap.tickets.filter(t=>t.resolved).map(t=>({ticket:t.id,hours:hours(t.created,t.resolved)}))};
}
