// Historical, weighted decision model. No live carrier quotes or prediction claims.
export const MODEL_VERSION = 'CP-WEIGHTED-1.0';
export function quantile(values, q) {
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const at=(a.length-1)*q, i=Math.floor(at);
  return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(at-i);
}
export function evaluatePlans(dataset, input) {
  const {country,weight,budget,days,service='all',fuel=0}=input;
  const raw=input.weights, total=raw.cost+raw.time+raw.reliability;
  if(!country||![weight,budget,days].every(v=>Number.isFinite(v)&&v>0)||!total||Object.values(raw).some(v=>!Number.isFinite(v)||v<0))throw Error('กรอกน้ำหนัก งบประมาณ จำนวนวัน และน้ำหนักการตัดสินใจให้ถูกต้อง');
  if(!Number.isFinite(fuel)||fuel < -30||fuel > 50)throw Error('การเปลี่ยนค่าเชื้อเพลิงต้องอยู่ระหว่าง −30% ถึง +50%');
  for(const key of ['revenue','overhead'])if(input[key]!==undefined&&(!Number.isFinite(input[key])||input[key]<0))throw Error('ราคาขายและค่าใช้จ่ายเพิ่มเติมต้องไม่ติดลบ');
  const weights=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v/total]));
  const relevant=dataset.shipments.filter(r=>r.destination_country===country&&(service==='all'||r.service_level===service)&&r.shipment_status==='DELIVERED');
  const alternatives=['SEA','AIR','ROAD'].map(mode=>{
    const all=relevant.filter(r=>r.transport_mode===mode&&Number(r.weight_kg)>0&&Number.isFinite(Number(r.transport_cost_usd))&&r.actual_delivery_utc&&r.booking_datetime_utc&&Date.parse(r.actual_delivery_utc)>Date.parse(r.booking_datetime_utc));
    const comparable=all.filter(r=>Number(r.weight_kg)>=weight/4&&Number(r.weight_kg)<=weight*4);
    const similar=comparable.length>=5, sample=similar?comparable:all;
    if(sample.length<5)return {mode,available:false,n:sample.length,reason:sample.length?'ข้อมูลส่งสำเร็จน้อยกว่า 5 รายการ':'ไม่มีข้อมูลการขนส่งรูปแบบนี้ในปลายทางที่เลือก'};
    const capacities=dataset.fleet.filter(u=>u.transport_mode===mode).map(u=>Number(u.capacity_kg)).filter(Number.isFinite);
    const maxCapacity=capacities.length?Math.max(...capacities):0;
    const rates=sample.map(r=>(Number(r.transport_cost_usd)+Number(r.fuel_cost_usd||0)*fuel/100)/Number(r.weight_kg));
    const lead=sample.map(r=>(Date.parse(r.actual_delivery_utc)-Date.parse(r.booking_datetime_utc))/86400000);
    const cost=quantile(rates,.5)*weight, p80=quantile(lead,.8), medianDays=quantile(lead,.5);
    const reliability=sample.filter(r=>r.on_time_delivery===true||r.on_time_delivery==='true').length/sample.length;
    const issues=[];
    if(cost>budget)issues.push('ต้นทุนประมาณการเกินงบ');
    if(p80>days)issues.push('ระยะเวลา P80 เกินกำหนด');
    if(weight>maxCapacity)issues.push('น้ำหนักเกินความจุหน่วยขนส่งที่มีข้อมูล');
    const reasons={};for(const r of sample)if(r.delay_reason)reasons[r.delay_reason]=(reasons[r.delay_reason]||0)+1;
    return {mode,available:true,n:sample.length,similar,cost,costLow:quantile(rates,.2)*weight,costHigh:quantile(rates,.8)*weight,days:p80,medianDays,reliability,deadlineShare:lead.filter(d=>d<=days).length/lead.length,maxCapacity,feasible:!issues.length,issues,reasons:Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,3),sampleIds:sample.map(r=>r.shipment_id)};
  });
  const available=alternatives.filter(a=>a.available);
  const normalized=(value,key,inverse)=>{const vals=available.map(a=>a[key]),min=Math.min(...vals),max=Math.max(...vals);if(max===min)return 1;return inverse?(max-value)/(max-min):(value-min)/(max-min);};
  for(const a of available){a.parts={cost:normalized(a.cost,'cost',true),time:normalized(a.days,'days',true),reliability:normalized(a.reliability,'reliability',false)};a.score=100*Object.entries(a.parts).reduce((s,[k,v])=>s+v*weights[k],0);}
  alternatives.sort((a,b)=>Number(!!b.available)-Number(!!a.available)||Number(!!b.feasible)-Number(!!a.feasible)||(b.score||0)-(a.score||0)||a.mode.localeCompare(b.mode));
  return {version:MODEL_VERSION,input:structuredClone(input),weights,alternatives,recommended:alternatives.find(a=>a.available&&a.feasible)?.mode||null,referenceCount:relevant.length,createdAt:new Date().toISOString()};
}
