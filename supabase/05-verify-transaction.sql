-- Replace the example UUID with an approved administrator before running.
-- All test data is rolled back. Uses the approved administrator's RLS context.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $verify$
declare p uuid:='7533641e-d6dc-4441-8e32-9c37e58d5fbf'; draft uuid:='a87ccc37-2fb6-4e52-ad5c-ccc46ecaa37d'; snap jsonb:='{"version":"CP-WEIGHTED-1.0","input":{"country":"Germany","weight":1200,"budget":20000,"days":30,"service":"all","fuel":0,"revenue":12000,"overhead":100,"weights":{"cost":40,"time":35,"reliability":25}},"weights":{"cost":0.4,"time":0.35,"reliability":0.25},"alternatives":[{"mode":"AIR","available":true,"n":14,"similar":true,"cost":8990.279823418607,"costLow":8319.681939363354,"costHigh":9408.541853598477,"days":4.393333333333333,"medianDays":4.087847222222222,"reliability":0.8571428571428571,"deadlineShare":1,"maxCapacity":100000,"feasible":true,"issues":[],"reasons":[["Departure Delay",1],["Documentation Hold",1]],"sampleIds":["CP-00067","CP-00134","CP-00223","CP-00227","CP-00417","CP-00445","CP-00821","CP-00849","CP-00996","CP-01218","CP-01394","CP-01439","CP-01613","CP-01623"],"parts":{"cost":0,"time":1,"reliability":1},"score":60},{"mode":"SEA","available":true,"n":34,"similar":true,"cost":843.3895318257212,"costLow":729.4309437714408,"costHigh":923.3903897400718,"days":27.791944444444443,"medianDays":27.37847222222222,"reliability":0.8235294117647058,"deadlineShare":0.9117647058823529,"maxCapacity":18000000,"feasible":true,"issues":[],"reasons":[["Port Congestion",2],["Weather Disruption",2],["Documentation Hold",1]],"sampleIds":["CP-00009","CP-00033","CP-00074","CP-00122","CP-00127","CP-00142","CP-00201","CP-00262","CP-00359","CP-00363","CP-00486","CP-00523","CP-00581","CP-00595","CP-00609","CP-00637","CP-00645","CP-00672","CP-00762","CP-00909","CP-00981","CP-00993","CP-01013","CP-01153","CP-01306","CP-01323","CP-01351","CP-01419","CP-01458","CP-01471","CP-01673","CP-01684","CP-01729","CP-01798"],"parts":{"cost":1,"time":0,"reliability":0},"score":40},{"mode":"ROAD","available":false,"n":0,"reason":"ไม่มีข้อมูลการขนส่งรูปแบบนี้ในปลายทางที่เลือก"}],"recommended":"AIR","referenceCount":57,"createdAt":"2026-10-05T22:55:39.800Z","selectedMode":"AIR"}'::jsonb; first_result jsonb; second_result jsonb; sid text; affected integer;
begin
  insert into public.decision_plans(id,result) values(p,snap);
  begin
    perform public.activate_decision_plan(p,'INVALID_DESTINATION','AIR-001',12000,100);
    raise exception 'FAIL: invalid destination accepted';
  exception when raise_exception then
    if SQLERRM <> 'Destination does not match plan' then raise; end if;
  end;
  assert (select status='DRAFT' from public.decision_plans where id=p),'Failed activation altered plan';
  first_result:=public.activate_decision_plan(p,'Hamburg','AIR-001',12000,100);
  sid:=first_result->'shipment'->>'shipment_id';
  assert first_result->>'status'='ACTIVE','Plan status';
  assert first_result->'shipment'->>'transport_mode'='AIR','Selected mode';
  assert (select revenue_usd=12000 and additional_cost_usd=100 and shipment_status='BOOKED' from public.shipments where shipment_id=sid),'Financial persistence';
  assert (select round(freight_cost_usd+fuel_cost_usd+handling_cost_usd+customs_cost_usd,2)=round(transport_cost_usd,2) from public.shipments where shipment_id=sid),'Cost components';
  assert (select count(*)=1 from public.events where shipment_id=sid),'Tracking event';
  second_result:=public.activate_decision_plan(p,'Hamburg','AIR-001',12000,100);
  assert second_result->'shipment'->>'shipment_id'=sid,'Duplicate activation';
  assert (select count(*)=1 from public.shipments where decision_plan_id=p),'Duplicate shipment';
  update public.shipments set revenue_usd=12500 where shipment_id=sid;
  assert (select revenue_usd=12500 from public.shipments where shipment_id=sid),'Admin edit';
  insert into public.decision_plans(id,result) values(draft,snap);
  delete from public.decision_plans where id=draft;
  assert not exists(select 1 from public.decision_plans where id=draft),'Draft delete';
  delete from public.decision_plans where id=p;
  get diagnostics affected = row_count;
  assert affected=0,'Active plan deletion must be denied';
end $verify$;
rollback;
select 'PASS: RLS save, validation, activation, financial data, tracking, retry, edit, draft delete; all test data rolled back' as verification;
