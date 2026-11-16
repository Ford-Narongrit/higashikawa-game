-- HIGASHIKAWA GAME — initial schema
-- รันครั้งเดียวใน Supabase Dashboard → SQL Editor (หรือ `supabase db push` ถ้าใช้ CLI)
--
-- สรุปสิทธิ์:
--   anon / authenticated : SELECT ได้เฉพาะ teams, game_state, score_events, team_scores
--                          เขียนอะไรไม่ได้เลย, เรียก function ไม่ได้
--   service_role (API)   : ทำได้ทุกอย่าง (bypass RLS)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id      smallint primary key check (id between 1 and 4),
  key     text not null unique check (key in ('spade', 'heart', 'diamond', 'club')),
  symbol  text not null,
  name_ja text not null,
  color   text not null
);

insert into public.teams (id, key, symbol, name_ja, color) values
  (1, 'spade',   '♠', 'スペード', '#2563eb'),
  (2, 'heart',   '♥', 'ハート',   '#dc2626'),
  (3, 'diamond', '♦', 'ダイヤ',   '#eab308'),
  (4, 'club',    '♣', 'クラブ',   '#16a34a');

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table public.players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  room         text not null check (room in ('A', 'B', 'C', 'D', 'E', 'F')),
  pin_hash     text not null,
  token_hash   text not null unique,
  team_id      smallint references public.teams (id),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ค้นหาชื่อซ้ำ (ชื่อ + ห้อง ไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่างหัวท้าย)
create index players_name_room_idx on public.players (lower(btrim(name)), room);
create index players_team_idx on public.players (team_id);

-- ---------------------------------------------------------------------------
-- game_state (singleton)
-- ---------------------------------------------------------------------------
create table public.game_state (
  id             boolean primary key default true check (id),
  teams_revealed boolean not null default false,
  box_open       boolean not null default false,
  photo_open     boolean not null default false,
  screen_view    text not null default 'join'
                 check (screen_view in ('join', 'teams', 'leaderboard', 'tree')),
  updated_at     timestamptz not null default now()
);

insert into public.game_state (id) values (true);

-- ---------------------------------------------------------------------------
-- settings (singleton)
-- ---------------------------------------------------------------------------
create table public.settings (
  id                    boolean primary key default true check (id),
  prize_table           jsonb not null default '[
    {"points": 10,  "weight": 40},
    {"points": 20,  "weight": 30},
    {"points": 50,  "weight": 20},
    {"points": 100, "weight": 8},
    {"points": -30, "weight": 2}
  ]'::jsonb,
  photo_points          integer not null default 5,
  max_photos_per_player integer not null default 2 check (max_photos_per_player >= 0),
  photo_team_cap        integer check (photo_team_cap is null or photo_team_cap >= 0)
);

insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- box_codes
-- ---------------------------------------------------------------------------
create table public.box_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  points      integer,
  redeemed_by uuid references public.players (id) on delete set null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  team_id     smallint not null references public.teams (id),
  path        text not null,
  thumb_path  text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create index photos_player_idx on public.photos (player_id);
create index photos_status_idx on public.photos (status, created_at);

-- ---------------------------------------------------------------------------
-- score_events
-- player_name ถูกคัดลอกมาเก็บไว้ (denormalized) เพื่อให้จอเวทีแสดงชื่อได้
-- โดยไม่ต้องเปิดให้ anon อ่านตาราง players
-- ---------------------------------------------------------------------------
create table public.score_events (
  id          bigint generated always as identity primary key,
  team_id     smallint not null references public.teams (id),
  points      integer not null,
  kind        text not null check (kind in ('admin', 'box', 'photo')),
  label       text,
  player_id   uuid references public.players (id) on delete set null,
  player_name text,
  photo_id    uuid unique references public.photos (id) on delete set null,
  box_code_id uuid unique references public.box_codes (id) on delete set null,
  voided      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index score_events_created_idx on public.score_events (created_at desc);

-- ---------------------------------------------------------------------------
-- team_scores view (security_invoker → เคารพ RLS ของ score_events)
-- ---------------------------------------------------------------------------
create view public.team_scores
with (security_invoker = true) as
select t.id as team_id,
       t.key,
       t.symbol,
       t.name_ja,
       t.color,
       coalesce(sum(e.points) filter (where not e.voided), 0)::integer as score
from public.teams t
left join public.score_events e on e.team_id = t.id
group by t.id
order by t.id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.teams        enable row level security;
alter table public.players      enable row level security;
alter table public.game_state   enable row level security;
alter table public.settings     enable row level security;
alter table public.box_codes    enable row level security;
alter table public.photos       enable row level security;
alter table public.score_events enable row level security;

create policy "public read teams"        on public.teams        for select to anon, authenticated using (true);
create policy "public read game_state"   on public.game_state   for select to anon, authenticated using (true);
create policy "public read score_events" on public.score_events for select to anon, authenticated using (true);
-- players / settings / box_codes / photos: ไม่มี policy = anon อ่าน/เขียนไม่ได้

-- กันอีกชั้น: ถอนสิทธิ์เขียนทั้งหมดจาก role ฝั่ง client
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.players, public.settings, public.box_codes, public.photos from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: ส่งการเปลี่ยนแปลงของ game_state และ score_events ให้ client
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.game_state, public.score_events;

-- ---------------------------------------------------------------------------
-- Functions (เรียกได้เฉพาะ service_role ผ่าน API route)
-- ---------------------------------------------------------------------------

-- สร้างผู้เล่น ถ้าเปิดเผยทีมแล้วให้ลงทีมที่คนน้อยที่สุด (เท่ากันสุ่ม)
create or replace function public.create_player(
  p_name text, p_room text, p_pin_hash text, p_token_hash text
) returns public.players
language plpgsql
set search_path = public
as $$
declare
  v_revealed boolean;
  v_team     smallint;
  v_player   public.players;
begin
  -- lock singleton เพื่อให้การเลือกทีมของคนที่มาสายเรียงกันทีละคน
  select teams_revealed into v_revealed from game_state where id for update;

  if v_revealed then
    select t.id into v_team
    from teams t
    left join players p on p.team_id = t.id
    group by t.id
    order by count(p.id), random()
    limit 1;
  end if;

  insert into players (name, room, pin_hash, token_hash, team_id)
  values (btrim(p_name), p_room, p_pin_hash, p_token_hash, v_team)
  returning * into v_player;

  return v_player;
end;
$$;

-- แบ่งทีม: จัดกลุ่มตามห้อง → shuffle ในห้อง → เรียงต่อกัน → แจกวน 1→2→3→4
-- idempotent: ถ้าเปิดเผยแล้วจะไม่แบ่งใหม่
create or replace function public.reveal_teams()
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_revealed boolean;
  v_offset   integer := floor(random() * 4)::integer;
begin
  select teams_revealed into v_revealed from game_state where id for update;
  if v_revealed then
    return false;
  end if;

  with ordered as (
    select id, row_number() over (order by room, random()) - 1 as rn
    from players
  )
  update players p
  set team_id = ((o.rn + v_offset) % 4) + 1
  from ordered o
  where p.id = o.id;

  update game_state set teams_revealed = true, updated_at = now() where id;
  return true;
end;
$$;

-- ใช้รหัสกล่องแบบ atomic: สุ่มคะแนนจาก prize_table แล้วสร้าง score_event
-- คืนค่า null ถ้ารหัสไม่มีอยู่หรือถูกใช้แล้ว
create or replace function public.redeem_box_code(p_code text, p_player_id uuid)
returns table (box_code_id uuid, points integer, team_id smallint)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  v_player public.players;
  v_prizes jsonb;
  v_total  numeric;
  v_roll   numeric;
  v_acc    numeric := 0;
  v_points integer;
  v_item   jsonb;
  v_box    public.box_codes;
begin
  select * into v_player from players where id = p_player_id;
  if v_player.id is null or v_player.team_id is null then
    raise exception 'player_has_no_team';
  end if;

  select prize_table into v_prizes from settings where id;
  select sum((x ->> 'weight')::numeric) into v_total from jsonb_array_elements(v_prizes) x;
  v_roll := random() * v_total;

  for v_item in select * from jsonb_array_elements(v_prizes) loop
    v_acc := v_acc + (v_item ->> 'weight')::numeric;
    v_points := (v_item ->> 'points')::integer;
    exit when v_roll < v_acc;
  end loop;

  update box_codes
  set redeemed_by = p_player_id, redeemed_at = now(), points = v_points
  where code = upper(btrim(p_code)) and redeemed_by is null
  returning * into v_box;

  if v_box.id is null then
    return;
  end if;

  insert into score_events (team_id, points, kind, label, player_id, player_name, box_code_id)
  values (v_player.team_id, v_points, 'box', 'プレゼント', v_player.id, v_player.name, v_box.id);

  return query select v_box.id, v_points, v_player.team_id;
end;
$$;

-- approve รูป + ให้คะแนน (เคารพ photo_team_cap) ทำได้ครั้งเดียวต่อรูป
-- คืนค่าคะแนนที่ให้ (0 ถ้าชนเพดาน), null ถ้ารูปไม่ได้อยู่ในสถานะ pending
create or replace function public.approve_photo(p_photo_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_photo   public.photos;
  v_points  integer;
  v_cap     integer;
  v_awarded integer;
begin
  update photos set status = 'approved', reviewed_at = now()
  where id = p_photo_id and status = 'pending'
  returning * into v_photo;

  if v_photo.id is null then
    return null;
  end if;

  select photo_points, photo_team_cap into v_points, v_cap from settings where id;

  if v_cap is not null then
    -- lock แถวทีมเพื่อไม่ให้ approve พร้อมกันทะลุเพดาน
    perform 1 from teams where id = v_photo.team_id for update;
    select count(*) into v_awarded from score_events
    where team_id = v_photo.team_id and kind = 'photo' and not voided;
    if v_awarded >= v_cap then
      return 0;
    end if;
  end if;

  insert into score_events (team_id, points, kind, label, player_id, player_name, photo_id)
  select v_photo.team_id, v_points, 'photo', 'しゃしん', p.id, p.name, v_photo.id
  from players p where p.id = v_photo.player_id
  on conflict (photo_id) do nothing;

  return v_points;
end;
$$;

-- ล้างข้อมูลทดสอบ (เก็บ teams / settings)
create or replace function public.reset_game()
returns void
language plpgsql
set search_path = public
as $$
begin
  truncate score_events, photos, box_codes, players cascade;
  update game_state
  set teams_revealed = false, box_open = false, photo_open = false,
      screen_view = 'join', updated_at = now()
  where id;
end;
$$;

revoke execute on function
  public.create_player(text, text, text, text),
  public.reveal_teams(),
  public.redeem_box_code(text, uuid),
  public.approve_photo(uuid),
  public.reset_game()
from public, anon, authenticated;

grant execute on function
  public.create_player(text, text, text, text),
  public.reveal_teams(),
  public.redeem_box_code(text, uuid),
  public.approve_photo(uuid),
  public.reset_game()
to service_role;

-- ---------------------------------------------------------------------------
-- Storage: bucket private สำหรับรูป (ไม่มี policy → client เข้าถึงตรงไม่ได้
-- ต้องใช้ signed URL ที่ API สร้างให้เท่านั้น)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
