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

## Checklist วันงาน

- [ ] **Wi-Fi ในยิม**: เอามือถือต่อ Wi-Fi แล้วเปิด `https://<project-ref>.supabase.co/auth/v1/health`
      ต้องเห็น `{"message":"No API key found..."}` ถ้าโหลดค้าง แปลว่า Wi-Fi บล็อก Supabase → ขอ IT ให้อนุญาต `*.supabase.co` หรือให้ผู้เล่นใช้เน็ตมือถือ
      (realtime ใช้ไม่ได้ แต่ระบบยัง polling ทุก 5 วินาทีผ่าน Vercel)
- [ ] **DNS ของ Mac**: System Settings → Wi-Fi → Details → DNS ควรเป็นอัตโนมัติ
      (เคยเจอ 1.1.1.1 / 8.8.8.8 ถูกบล็อกในบางเครือข่าย ทำให้ต่อ Supabase ไม่ได้)
- [ ] Supabase free project หยุดเองถ้าไม่ได้ใช้ 7 วัน — เปิดเช็กวันก่อนงาน
- [ ] เปิด `/api/health` บน URL จริง ทุกช่องต้องเป็น `true`

## หลังจบงาน

- [ ] export คะแนนสุดท้ายจาก `/admin` เก็บไว้
- [ ] รัน `npm run purge-photos` เพื่อลบรูปทั้งหมดใน Storage และตาราง photos **ภายใน 30 วันหลังงาน** (หรือตามที่โรงเรียนกำหนด)
- [ ] ตรวจใน Supabase → Storage → `photos` ว่าว่างแล้ว
