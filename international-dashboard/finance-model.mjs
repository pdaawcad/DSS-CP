// All values in THB, unless explicitly named USD. Educational scenario model v1.
export const total=(rows,key)=>rows.reduce((s,r)=>s+Number(r[key]||0),0);
export const months=Array.from({length:36},(_,i)=>{const d=new Date(Date.UTC(2023,9+i,1));return d.toISOString().slice(0,7);});
export function summarize(db,start,end){
 const trips=db.finance_trips.filter(t=>t.month>=start&&t.month<=end);
 const jobs=db.finance_jobs.filter(j=>j.delivered_on.slice(0,7)>=start&&j.delivered_on.slice(0,7)<=end);
 const expenses=db.finance_expenses.filter(e=>e.month>=start&&e.month<=end);
 const cash=db.finance_cashflows.filter(c=>c.date.slice(0,7)>=start&&c.date.slice(0,7)<=end);
 const revenue=total(jobs,'revenue_thb'),fuel=total(trips,'fuel_thb'),direct=fuel+total(trips,'handling_thb')+total(trips,'other_thb');
 const fixed=total(expenses.filter(e=>e.asset),'amount_thb'),overhead=total(expenses.filter(e=>!e.asset),'amount_thb');
 const cashIn=total(cash.filter(c=>c.direction==='IN'),'amount_thb'),cashOut=total(cash.filter(c=>c.direction==='OUT'),'amount_thb');
 return {start,end,trips,jobs,expenses,revenue,fuel,direct,fixed,overhead,profit:revenue-direct-fixed-overhead,margin:revenue?100*(revenue-direct-fixed-overhead)/revenue:null,cashIn,cashOut,netCash:cashIn-cashOut,load:total(trips,'capacity_kg')?100*total(trips,'load_kg')/total(trips,'capacity_kg'):0,otd:jobs.length?100*jobs.filter(j=>j.on_time).length/jobs.length:0};
}
export function breakdown(db,start,end,key){
 const s=summarize(db,start,end),lookup=new Map(db.finance_trips.map(t=>[t.id,t]));
 const result=new Map();
 for(const j of s.jobs){const t=lookup.get(j.trip_id);if(!t)continue;const label=key==='customer'?j.customer:t[key];
 const g=result.get(label)||{label,revenue:0,direct:0,jobs:0};g.revenue+=Number(j.revenue_thb);g.direct+=(Number(t.fuel_thb)+Number(t.handling_thb)+Number(t.other_thb))*Number(j.weight_kg)/Number(t.load_kg);g.jobs++;result.set(label,g);}
 return [...result.values()].map(g=>({...g,contribution:g.revenue-g.direct})).sort((a,b)=>b.contribution-a.contribution);
}
export const defaults={price:2,fuel:4,consolidate:3,elasticity:0.7,minOtd:90,maxLoad:95,goal:10,implementation:0};
const scenarioCache=new WeakMap();
export function simulate(db,input={}){
 const p={...defaults,...input};
 for(const [key,min,max] of [['price',0,15],['fuel',0,15],['consolidate',0,15],['elasticity',0,3],['minOtd',0,100],['maxLoad',1,100],['goal',0,100],['implementation',0,1e9]])if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error('ค่า '+key+' อยู่นอกช่วงที่รองรับ');
 if(!scenarioCache.has(db))scenarioCache.set(db,{baseline:summarize(db,'2025-10','2026-09'),monthly:months.slice(-12).map(m=>summarize(db,m,m))});
 const {baseline,monthly}=scenarioCache.get(db);
 const volume=Math.max(0,1-p.price/100*p.elasticity),tripFactor=volume*(1-p.consolidate/100);
 const otd=Math.max(0,baseline.otd-p.consolidate*.25);
 const reasons=[];
 // Conservative uniform consolidation pressure applied to every baseline trip.
 const maxProjectedLoad=Math.max(...baseline.trips.map(t=>100*Number(t.load_kg)/Number(t.capacity_kg)/(1-p.consolidate/100)));
 if(maxProjectedLoad>p.maxLoad)reasons.push('ความจุสูงสุดต่อเที่ยวเกินเพดานที่กำหนด');
 if(otd<p.minOtd)reasons.push('อัตราส่งตรงเวลาประมาณการต่ำกว่าเป้าหมาย');
 const targets=monthly.map(b=>{const m=b.start,year=Number(m.slice(0,4))+1;const revenue=b.revenue*(1+p.price/100)*volume;const direct=(b.direct-b.fuel*p.fuel/100)*tripFactor,overhead=b.overhead+p.implementation/12;return {month:year+m.slice(4),revenue,direct,fixed:b.fixed,overhead,profit:revenue-direct-b.fixed-overhead};});
 const profit=total(targets,'profit'),delta=profit-baseline.profit,goalAmount=baseline.profit>0?baseline.profit*(1+p.goal/100):0;
 return {parameters:p,baseline:{profit:baseline.profit,revenue:baseline.revenue,direct:baseline.direct,fixed:baseline.fixed,overhead:baseline.overhead,otd:baseline.otd},targets,profit,delta,goalAmount,goalMet:profit>=goalAmount,feasible:!reasons.length,reasons,maxProjectedLoad,otd,volumeChange:(volume-1)*100,version:1};
}
