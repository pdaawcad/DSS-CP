"""CP global logistics teaching scenario; all operations and costs are synthetic."""
import csv,json,math,random
from datetime import datetime,timedelta,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'/'international-source'
OUT.mkdir(parents=True,exist_ok=True)
r=random.Random(20261005)
snapshot=datetime(2025,9,30,23,59,tzinfo=timezone.utc)
destinations=[
('Kuala Lumpur','Malaysia','มาเลเซีย','Asia','KUL',3.14,101.69),
('Singapore','Singapore','สิงคโปร์','Asia','SIN',1.35,103.82),
('Ho Chi Minh City','Vietnam','เวียดนาม','Asia','SGN',10.82,106.63),
('Shanghai','China','จีน','Asia','SHA',31.23,121.47),
('Tokyo','Japan','ญี่ปุ่น','Asia','TYO',35.68,139.69),
('Busan','South Korea','เกาหลีใต้','Asia','PUS',35.18,129.07),
('Mumbai','India','อินเดีย','Asia','BOM',19.08,72.88),
('Jakarta','Indonesia','อินโดนีเซีย','Asia','JKT',-6.21,106.85),
('Dubai','United Arab Emirates','สหรัฐอาหรับเอมิเรตส์','Asia','DXB',25.2,55.27),
('Jeddah','Saudi Arabia','ซาอุดีอาระเบีย','Asia','JED',21.49,39.19),
('Hamburg','Germany','เยอรมนี','Europe','HAM',53.55,9.99),
('Rotterdam','Netherlands','เนเธอร์แลนด์','Europe','RTM',51.92,4.48),
('London','United Kingdom','สหราชอาณาจักร','Europe','LON',51.51,-.13),
('Le Havre','France','ฝรั่งเศส','Europe','LEH',49.49,.11),
('Barcelona','Spain','สเปน','Europe','BCN',41.39,2.17),
('Los Angeles','United States of America','สหรัฐอเมริกา','North America','LAX',34.05,-118.24),
('Vancouver','Canada','แคนาดา','North America','YVR',49.28,-123.12),
('Manzanillo','Mexico','เม็กซิโก','North America','ZLO',19.05,-104.32),
('Santos','Brazil','บราซิล','South America','SSZ',-23.96,-46.33),
('Valparaiso','Chile','ชิลี','South America','VAP',-33.05,-71.61),
('Buenos Aires','Argentina','อาร์เจนตินา','South America','BUE',-34.60,-58.38),
('Alexandria','Egypt','อียิปต์','Africa','ALY',31.2,29.92),
('Durban','South Africa','แอฟริกาใต้','Africa','DUR',-29.86,31.02),
('Mombasa','Kenya','เคนยา','Africa','MBA',-4.04,39.67),
('Sydney','Australia','ออสเตรเลีย','Oceania','SYD',-33.87,151.21),
('Auckland','New Zealand','นิวซีแลนด์','Oceania','AKL',-36.85,174.76)]
meta=[dict(zip(['name','country','label','region','code','lat','lon'],d)) for d in destinations]
def write(name,rows):
    with (OUT/name).open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
def iso(d):return d.isoformat(timespec='minutes').replace('+00:00','Z') if d else ''
def km(lat,lon):
    a,b=map(math.radians,[13.76,lat]);dl=math.radians(lon-100.5)
    return 6371*2*math.asin(min(1,math.sqrt(math.sin((b-a)/2)**2+math.cos(a)*math.cos(b)*math.sin(dl/2)**2)))
fleet=[];people=[]
for mode,count,model,cap in [('ROAD',12,'CP Roadliner',24000),('SEA',16,'CP Container Vessel',18000000),('AIR',12,'CP Cargo Aircraft',100000)]:
    for i in range(count):
        uid=f'{mode}-{i+1:03d}';pid=f'CP-OP-{len(people)+1:03d}'
        fleet.append(dict(vehicle_id=uid,vehicle_name=f'{model} {i+1:02d}',transport_mode=mode,capacity_kg=cap,operator_id=pid,home_base='Thailand'))
        people.append(dict(operator_id=pid,operator_name=f'CP Operations {len(people)+1:02d}',role={'ROAD':'คนขับรถ','SEA':'ผู้ประสานงานเรือ','AIR':'ผู้ประสานงานเที่ยวบิน'}[mode],transport_mode=mode,experience_years=r.randint(2,15)))
shipments=[];events=[]
for n in range(1,1801):
    d=r.choices(meta,weights=[5 if x['region']=='Asia' else 3 if x['region']=='Europe' else 2 for x in meta])[0]
    modes=['ROAD','SEA','AIR'] if d['country'] in ['Malaysia','Singapore','Vietnam'] else ['SEA','AIR']
    mode=r.choices(modes,weights=[45,35,20] if len(modes)==3 else [65,35])[0]
    unit=r.choice([u for u in fleet if u['transport_mode']==mode]);service=r.choices(['STANDARD','EXPRESS'],[78,22])[0]
    booking=datetime(2025,4,1,tzinfo=timezone.utc)+timedelta(days=int(183*(r.random()**.82)),hours=r.randrange(24))
    depart_plan=booking+timedelta(hours=r.randint(12,36));depart=depart_plan+timedelta(hours=r.choices([0,4,12,24],[70,18,9,3])[0])
    distance=round(km(d['lat'],d['lon'])*{'ROAD':1.3,'SEA':1.45,'AIR':1.05}[mode])
    transit={'ROAD':distance/45+24,'SEA':distance/24+72,'AIR':distance/650+24}[mode]*(.87 if service=='EXPRESS' else 1)
    customs=round(r.uniform(4,18),1);problem=r.random()<.22
    reason=r.choice(['Customs Inspection','Documentation Hold','Weather Disruption']+(['Port Congestion'] if mode=='SEA' else ['Border Queue'] if mode=='ROAD' else ['Flight Reschedule'])) if problem else ''
    delay=r.uniform(32,110) if problem else r.uniform(0,8)
    arrival=depart+timedelta(hours=transit+(delay if reason not in ['Customs Inspection','Documentation Hold'] else 0))
    customs+=delay if reason in ['Customs Inspection','Documentation Hold'] else 0
    cleared=arrival+timedelta(hours=customs);delivery=cleared+timedelta(hours=12)
    plan=depart_plan+timedelta(hours=transit+48)
    status='DELIVERED' if delivery<=snapshot else 'BOOKED' if depart>snapshot else 'IN_TRANSIT'
    if delivery>plan and not reason:reason='Departure Delay'
    origin={'ROAD':'Bangkok, Thailand','SEA':'Laem Chabang, Thailand','AIR':'Suvarnabhumi, Thailand'}[mode]
    weight=round(r.uniform(100,4000) if mode!='AIR' else r.uniform(25,1200),1)
    freight=round(weight*distance*{'ROAD':.0007,'SEA':.000035,'AIR':.00065}[mode]*(1.25 if service=='EXPRESS' else 1)*r.uniform(.9,1.1),2)
    fuel=round(freight*r.uniform(.15,.25),2);handling=round(45+weight*.025,2);clearance=round(r.uniform(60,220),2);cost=round(freight+fuel+handling+clearance,2)
    sid=f'CP-{n:05d}'
    shipments.append(dict(shipment_id=sid,booking_datetime_utc=iso(booking),origin_location=origin,origin_country='Thailand',destination_location=d['name'],destination_country=d['country'],destination_region=d['region'],carrier_name='CP',transport_mode=mode,service_level=service,vehicle_id=unit['vehicle_id'],operator_id=unit['operator_id'],product_category=r.choice(['Electronics','Auto Parts','Food Packaging','Textiles','Machinery']),weight_kg=weight,distance_km_assumed=distance,planned_departure_utc=iso(depart_plan),actual_departure_utc=iso(depart) if depart<=snapshot else '',planned_delivery_utc=iso(plan),actual_delivery_utc=iso(delivery) if status=='DELIVERED' else '',customs_clearance_hours=round(customs,1) if cleared<=snapshot else '',transport_cost_usd=cost,freight_cost_usd=freight,fuel_cost_usd=fuel,handling_cost_usd=handling,customs_cost_usd=clearance,shipment_status=status,delay_reason=reason if status=='DELIVERED' and delivery>plan else '',on_time_delivery=str(delivery<=plan).lower() if status=='DELIVERED' else ''))
    milestones=[('BOOKED',booking,booking,origin),('PICKED_UP',booking+timedelta(hours=6),booking+timedelta(hours=6),origin),('EXPORT_CLEARED',depart-timedelta(hours=2),depart_plan-timedelta(hours=2),origin),('DEPARTED_ORIGIN',depart,depart_plan,origin),('ARRIVED_DESTINATION',arrival,depart_plan+timedelta(hours=transit),d['name']),('CUSTOMS_CLEARED',cleared,depart_plan+timedelta(hours=transit+24),d['name']),('DELIVERED',delivery,plan,d['name'])]
    seq=0
    for stage,at,planned,location in milestones:
        if at>snapshot:continue
        seq+=1;events.append(dict(event_id=f'EV-{len(events)+1:06d}',shipment_id=sid,event_sequence=seq,event_type=stage,event_datetime_utc=iso(at),planned_event_datetime_utc=iso(planned),event_location=location,event_description=stage.replace('_',' ').title(),delay_reason=reason if stage=='CUSTOMS_CLEARED' and reason in ['Customs Inspection','Documentation Hold'] else reason if stage=='ARRIVED_DESTINATION' and reason not in ['Customs Inspection','Documentation Hold'] else ''))
write('shipments.csv',shipments);write('tracking_events.csv',events);write('fleet.csv',fleet);write('operators.csv',people)
(OUT/'destinations.json').write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8')
(OUT/'README.md').write_text(f'''# CP Global Logistics — ชุดข้อมูลจำลอง

1,800 shipments, {len(events):,} tracking events, 26 ประเทศ ใน 6 ภูมิภาคที่มีประชากรอาศัย (ไม่ใช่ทุกประเทศในโลก) เม.ย.–ก.ย. 2025 snapshot 30 ก.ย. 2025 UTC

บริษัทจำลองชื่อ CP สำหรับโครงงานนี้ ไม่ใช่ข้อมูลบริษัทจริง รูปแบบขนส่ง ROAD/SEA/AIR; รถใช้เฉพาะมาเลเซีย สิงคโปร์ เวียดนาม ประเทศข้ามมหาสมุทรใช้เรือหรือเครื่องบิน

ระยะทางประมาณจากพิกัดเมืองแบบ great-circle คูณตัวคูณสมมติ ไม่ใช่ระยะเส้นทางใช้งานจริง ต้นทุน USD ระยะเวลาขนส่ง SLA และเหตุการณ์เป็นค่าจำลองทั้งหมด ต้นทุนรวม = freight + fuel + handling + customs; สำหรับงานเปิดเป็นต้นทุนงบประมาณ ยังไม่ใช่บัญชีต้นทุนที่ปิดแล้ว

fleet.csv คือหน่วยขนส่งจำลอง 40 หน่วย operators.csv คือผู้รับผิดชอบจำลอง ไม่ใช่ข้อมูลคนจริง การมอบหมายใช้เพื่อสาธิตการเชื่อมข้อมูล ไม่มีตารางจองหรือเที่ยวรถ จึงไม่ใช้คำนวณอัตราใช้รถหรือยืนยันความเป็นไปได้ของตารางปฏิบัติงาน

shipments หนึ่งแถวต่อรายการส่ง; tracking_events หนึ่งแถวต่อเหตุการณ์ เชื่อม shipment_id; fleet และ operators เชื่อม vehicle_id/operator_id ตามลำดับ

สร้างใหม่ด้วย `python scripts/generate_global_data.py` แล้วอัปเดตเว็บด้วย `python scripts/prepare_international_dashboard.py`
''',encoding='utf-8')
print(f'Generated {len(shipments)} shipments, {len(events)} events, {len(meta)} countries, {len(fleet)} assets')
