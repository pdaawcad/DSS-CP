"""Deterministic, separate educational ledger. Never changes operational shipments."""
import json, math, random, csv
from pathlib import Path
from datetime import date, timedelta
ROOT = Path(__file__).resolve().parents[1]
rng = random.Random(20261018)
tables = {k: [] for k in ['finance_trips','finance_jobs','finance_expenses','finance_cashflows']}
def add(t, **r): tables[t].append(r); return r
fleet=list(csv.DictReader((ROOT/'data/international-source/fleet.csv').open(encoding='utf-8-sig')))
routes = {'ROAD':['Malaysia','Vietnam','Singapore','Cambodia'], 'SEA':['Germany','United States','Japan','Australia'], 'AIR':['Germany','United States','Japan','United Kingdom']}
for i in range(36):
    year, m = divmod(2023*12+9+i,12); m += 1
    month=f'{year}-{m:02d}'
    fx=round(34.4+1.2*math.sin(i/4),4)
    season=1+(.13 if m in [10,11,12] else -.08 if m in [2,3] else 0)
    problem=1.22 if 15<=i<=19 else 1
    for vehicle in fleet:
        mode=vehicle['transport_mode']; capacity=int(vehicle['capacity_kg']); asset=vehicle['vehicle_id']
        price,fixed={'ROAD':(16,65000),'SEA':(1.55,3000000),'AIR':(110,1900000)}[mode]
        j=(int(asset[-3:])-1)%4
        for departure in range(1):
            tid=f'FIN-{month}-{asset}'
            load=round(capacity*min(.91,(.60+i*.004+rng.uniform(-.05,.06))*season))
            revenue=round(load*price*(1+i*.003),2)
            direct=round(capacity*price*.40*problem,2)
            trip=add('finance_trips',id=tid,month=month,mode=mode,asset=asset,destination=routes[mode][j],capacity_kg=capacity,load_kg=load,fuel_thb=round(direct*.56,2),handling_thb=round(direct*.24,2),other_thb=round(direct*.20,2))
            for k in range(3):
                jid=tid+f'-{k+1}'; weight=load//3 if k<2 else load-2*(load//3)
                usd=round(revenue*weight/load/fx,2)
                delivered=f'{month}-{7+j*6:02d}'
                add('finance_jobs',id=jid,trip_id=tid,customer=f'CP Customer {j*3+k+1:02d}',delivered_on=delivered,weight_kg=weight,revenue_usd=usd,fx_rate=fx,revenue_thb=round(usd*fx,2),on_time=rng.random()>(.18 if problem>1 else .06))
                # Cash on actual receipt date; last-month receivables can remain outstanding.
                paid=date.fromisoformat(delivered)+timedelta(days=30 if k==0 else 7)
                if paid<=date(2026,9,30): add('finance_cashflows',id='R-'+jid,date=paid.isoformat(),direction='IN',amount_thb=round(usd*fx,2),reference=jid,category='Customer receipt')
            add('finance_cashflows',id='P-'+tid,date=f'{month}-27',direction='OUT',amount_thb=round(trip['fuel_thb']+trip['handling_thb']+trip['other_thb'],2),reference=tid,category='Trip cost')
        for category, share in [('crew',.40),('insurance',.12),('maintenance',.18),('depreciation',.30)]:
            eid=f'E-{month}-{asset}-{category}'; amount=round(fixed*share*(1+i*.002),2)
            add('finance_expenses',id=eid,month=month,asset=asset,category=category,amount_thb=amount)
            if category!='depreciation': add('finance_cashflows',id='P-'+eid,date=f'{month}-28',direction='OUT',amount_thb=amount,reference=eid,category=category)
    for category, amount in [('salary',420000),('rent',150000),('marketing',120000*(1.6 if 15<=i<=19 else 1))]:
        eid=f'E-{month}-{category}'; amount=round(amount*(1+i*.002),2)
        add('finance_expenses',id=eid,month=month,asset=None,category=category,amount_thb=amount)
        add('finance_cashflows',id='P-'+eid,date=f'{month}-28',direction='OUT',amount_thb=amount,reference=eid,category=category)
data={'meta':{'synthetic':True,'start':'2023-10','end':'2026-09','scope':'Separate training ledger: All 40 company-owned assets, one synthetic trip per asset per month. Separate training accounts, not consolidated with original operational shipments.','opening_cash_thb':0,'assets':len(fleet)},**tables}
(ROOT/'international-dashboard/assets/finance.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def sqlval(v):
    if v is None:return 'null'
    if isinstance(v,bool):return 'true' if v else 'false'
    if isinstance(v,(int,float)):return str(v)
    return "'"+str(v).replace("'","''")+"'"
chunks=[]
for table, records in tables.items():
    for start in range(0,len(records),250):
        batch=records[start:start+250]; keys=list(batch[0])
        chunks.append('insert into public.'+table+' ('+','.join(keys)+') values\n'+',\n'.join('('+','.join(sqlval(r[k]) for k in keys)+')' for r in batch)+'\non conflict (id) do nothing;')
chunks.append("insert into public.finance_dataset (id,meta) values ('training-v1',"+sqlval(json.dumps(data['meta']))+"::jsonb) on conflict(id) do nothing;")
(ROOT/'supabase/07-finance-seed.json').write_text(json.dumps(chunks,ensure_ascii=False),encoding='utf-8')
(ROOT/'supabase/07-finance-seed.sql').write_text('\n'.join(chunks),encoding='utf-8')
print({k:len(v) for k,v in tables.items()})
