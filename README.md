# DSS-CP — CP Logistics DSS

A standalone teaching project for CP Global Logistics, separate from the UBON FLOW Logistics DSS Dashboard.

The default app page is the decision center. The analytics dashboard is available in the left navigation. The globe and shipping vehicles use locally bundled Three.js assets.

## Run locally

From this folder, run:

```powershell
python scripts/prepare_international_dashboard.py
python -m http.server 4175 --bind 127.0.0.1 --directory international-dashboard
```

Then open `http://127.0.0.1:4175/#dss`.

## Data and decision model

The source CSV files in `data/international-source/` and the generated dashboard snapshot contain synthetic shipments to 26 destinations, tracking events, vehicle units, and fictional operators. They are for coursework only and do not represent real CP operations or carrier quotations.

The DSS compares estimated cost per kg, historical booking-to-delivery P80, and historical on-time delivery. It requires at least five examples per mode, identifies when a mode has insufficient evidence, and recommends only options that meet the entered budget, deadline and recorded fleet capacity. Saved plans are Supabase records with the model snapshot at calculation time.

To check the model locally, run `node scripts/check_decision_model.mjs`.

## Supabase setup status

SQL schema, seed data, admin access setup, and instructions are in `supabase/`. The connection is enabled; database writes require a configured administrator account. No service role key is included.

## Deploy

From this folder, deploy with Vercel using framework **Other**, no install or build command, and output directory `international-dashboard`. The root `vercel.json` applies this setting.

## แผนงานและกำไร
เปิดเชื่อม Supabase แล้ว โดยอ่านข้อมูลจากฐานข้อมูลจริง การบันทึก ลบแผนร่าง และยืนยันแผนต้องเข้าสู่ระบบผู้ดูแลผ่าน Supabase Auth การยืนยันเรียกฟังก์ชัน activate_decision_plan เพื่อสร้างรายการ BOOKED เหตุการณ์ติดตาม และเปลี่ยนสถานะแผนในธุรกรรมเดียวกัน มีการล็อกแผนและป้องกันงานซ้ำเมื่อส่งคำขอซ้ำ

กำไรขั้นต้นประมาณการ = ราคาขาย − ต้นทุนขนส่ง − ค่าใช้จ่ายเพิ่ม ยังไม่หักภาษีและค่าใช้จ่ายส่วนกลาง งานเก่าที่ไม่ได้ระบุราคาขายจะไม่รวมยอดกำไร แผนเก่าที่เก็บในเบราว์เซอร์ยังคงอยู่และนำเข้าเป็นแผนร่างได้จากหน้าแผนที่บันทึกหลังเข้าสู่ระบบ

ตรวจจากรากโปรเจกต์: `node scripts/check_decision_model.mjs`, `node scripts/check_plan_lifecycle.cjs`, `node scripts/check_cloud_plans.cjs` การตรวจโค้ดใช้ข้อมูลจำลองและไม่แก้ข้อมูลผู้ใช้

สถานะติดตั้ง 2026-10-04: สร้างตารางและฟังก์ชันแล้ว นำเข้าข้อมูล 1,800 shipments / 11,985 events / 26 destinations / 40 fleet / 40 operators สำเร็จ ตรวจการอ่านผ่าน REST และหน้าเว็บแล้ว อัปเดต 2026-10-06: กำหนดสิทธิ์ผู้ดูแลตามคำยืนยันแล้ว ผู้ใช้ล็อกอินผ่านเว็บสำเร็จ ทดสอบการเขียนและยืนยันแผนในฐานข้อมูลภายใต้สิทธิ์บัญชีนี้ผ่าน โดยย้อนคืนข้อมูลทดสอบทั้งหมด ดูขั้นตอนใน supabase/README.md
