-- จำกัดการเดา PIN: ผิด 5 ครั้ง → ล็อก 1 นาที (PIN มีแค่ 10,000 แบบ)
alter table public.players
  add column if not exists pin_failed_attempts integer not null default 0,
  add column if not exists pin_locked_until    timestamptz;

notify pgrst, 'reload schema';
