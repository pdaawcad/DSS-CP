# CP LOGISTICS — Global Operations Dashboard

Dashboard โทนเข้มสำหรับบริษัทจำลอง CP มีโลก 3D หมุน/ซูมได้บนพื้นหลังหน้าเว็บ ไม่มีกรอบรอบโลก

## เปิดใช้งาน

จากราก repository รัน `python -m http.server 4175 --bind 127.0.0.1 --directory international-dashboard` แล้วเปิด http://127.0.0.1:4175/

สร้างข้อมูลใหม่ด้วย `python scripts/generate_global_data.py` แล้วรัน `python scripts/prepare_international_dashboard.py` เพื่อสร้าง JSON และรวม app.js/globe.js เป็น dashboard.js หลังแก้โค้ดให้รันคำสั่งหลังอีกครั้ง

## หน้าและการโต้ตอบ

- ภาพรวม: KPI, โลก 3D, กราฟ 5 ชุด กรองเดือน ภูมิภาค ประเทศ วิธีขนส่ง และบริการ
- รายการส่ง: ค้นหา กรองสถานะ แบ่งหน้า timeline และลิงก์หน่วยขนส่ง/ผู้รับผิดชอบ
- เส้นทาง: เปรียบเทียบ 2 ประเทศและดูตารางเครือข่ายทั่วโลก
- หน่วยขนส่ง: รถ เรือ เครื่องบิน 40 หน่วย พร้อมงานที่มอบหมายตามตัวกรอง
- ผู้รับผิดชอบ: บุคลากรสมมติ 40 คน พร้อมหน่วยขนส่งและงานล่าสุด
- ต้นทุน: แยก 4 หมวด และจำลองผลการเปลี่ยนค่าเชื้อเพลิง -30% ถึง +50%

## ข้อมูลและนิยาม

1,800 shipments และ 11,985 events จากไทยไป 26 ประเทศใน 6 ภูมิภาคที่มีประชากรอาศัย ไม่ใช่ทุกประเทศในโลก ข้อมูลเมษายน–กันยายน 2025 สถานะ ณ 30 กันยายน 2025 UTC

CP เป็นชื่อบริษัทสมมติในโครงงาน ไม่ใช่ข้อมูลการดำเนินงานบริษัทจริง ทุกต้นทุน เวลา ระยะทาง บุคลากร และยานพาหนะเป็นสมมติฐาน ระยะทางประมาณจากพิกัดเมือง ไม่ใช่เส้นทางถนน/เดินเรือจริง การมอบหมายยานพาหนะไม่มีตารางเที่ยวหรือการตรวจคิวรถ ไม่ใช้อนุมานอัตราใช้ทรัพยากรจริง

OTD = งานส่งสำเร็จทันกำหนด / งานส่งสำเร็จทั้งหมด งานเปิดไม่อยู่ในตัวหาร เวลาขนส่งเฉลี่ยใช้เวลาออกเดินทางถึงส่งมอบ ต้นทุน/kg ใช้ต้นทุนรวม/น้ำหนักรวม งานที่ยังเปิดใช้ต้นทุนงบประมาณ กราฟประเทศแสดง 8 ประเทศ และกราฟต้นทุนแสดง 5 ประเทศที่มีงานมากที่สุดตามตัวกรอง

เส้นทางบนโลกเป็นเส้นโค้งเชื่อมตำแหน่งเพื่อสื่อข้อมูล ไม่ใช่ GPS สด แผนที่ Natural Earth 1:110m, public domain: https://www.naturalearthdata.com/about/terms-of-use/

ปัจจุบันอ่านจาก Supabase และบันทึกผ่านบัญชีผู้ดูแล เมื่อเชื่อมต่อไม่ได้จะใช้ JSON ตัวอย่างแบบอ่านอย่างเดียว ข้อค้นพบในภาพรวมและ what-if เป็นการวิเคราะห์เชิงพรรณนา ยังไม่ใช่ Data Mining

## Deployment

vercel.json ที่ราก repository ตั้ง outputDirectory เป็น international-dashboard แล้ว สามารถใช้ root repository ใน Vercel หรือเลือก Root Directory เป็น international-dashboard ด้วย Framework Other ยังไม่มีการ deploy ในขั้นตอนนี้

## DSS decision center

The default route is `#dss`. The existing analytics dashboard is `#overview`, accessible from the sidebar and the main-page Dashboard button. `#history` stores up to 30 decision snapshots in this browser.

- Enter destination, weight, budget, days from booking, and service level.
- Adjust cost, time and historical on-time weights; optionally change the fuel component.
- The model uses completed shipments for the same destination and service. At least five records are required. Weight-matched samples (0.25–4 times the entered weight) are used when at least five are available.
- Estimated cost is the median observed cost/kg times entered weight. Duration is booking-to-delivery P80. These are educational estimates, not quotes or guaranteed dates.
- Min–Max utilities are combined with normalized weights. Recommendations must also satisfy budget, duration, and recorded vehicle capacity. A high-scoring infeasible option is never recommended.
- The reason dialog explains every contribution, sample size, P20–P80 cost spread, and historical delay reasons. No Data Mining or future probability claim is made.

`transport-3d.mjs` renders procedural truck, ship, aircraft and globe models with locally vendored Three.js 0.180.0 (MIT, license in `vendor/three/LICENSE`). One shared WebGL canvas renders visible scene regions. Animation pauses in hidden tabs and supports reduced motion and a pause control. CSS/SVG fallback remains available if WebGL fails.

Build the bundled classic entry point using `scripts/prepare_international_dashboard.py`. Check decision constraints with `node scripts/check_decision_model.mjs` from the repository root.

## Database setup status

Supabase setup is paused. `cpSupabase.enabled` is currently false, so the site uses the educational dataset and the backend remains gated pending real database setup. The old local `admin/admin` session is not used as server authentication. SQL and setup steps are in `supabase/README.md`. Saved DSS plans are local browser snapshots and are not yet synchronized to Supabase.
