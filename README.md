# HIGASHIKAWA GAME

ระบบเกมงานคริสต์มาส 25 ธ.ค. 2026 — Next.js + Supabase + Vercel
รายละเอียดสเปกทั้งหมดอยู่ใน `CLAUDE.md`

## เริ่มพัฒนาบนเครื่อง

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าจริง
npm run dev                  # http://localhost:3000
```

ตรวจว่าตั้งค่าครบ: เปิด `http://localhost:3000/api/health` ทุกช่องต้องเป็น `true`

## ฐานข้อมูล

SQL อยู่ใน `supabase/migrations/` — รันตามลำดับชื่อไฟล์ใน Supabase Dashboard → SQL Editor

## หลังจบงาน

- [ ] export คะแนนสุดท้ายจาก `/admin` เก็บไว้
- [ ] รัน `npm run purge-photos` เพื่อลบรูปทั้งหมดใน Storage และตาราง photos **ภายใน 30 วันหลังงาน** (หรือตามที่โรงเรียนกำหนด)
- [ ] ตรวจใน Supabase → Storage → `photos` ว่าว่างแล้ว
