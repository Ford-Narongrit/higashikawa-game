-- Phase 4: ส่งรูป / ตรวจรูป
-- photo_team_cap = เพดาน "คะแนน" จากรูปต่อทีม (null = ไม่จำกัด)

-- กดส่งซ้ำ (retry) ต้องไม่สร้างรูปซ้ำ
alter table public.photos add constraint photos_path_key unique (path);

-- บันทึกรูปหลังอัปโหลดไฟล์เสร็จ: lock แถวผู้เล่นเพื่อไม่ให้ส่งพร้อมกันเกินโควตา
-- รูปที่ถูก reject ไม่นับ (คืนสิทธิ์)
create or replace function public.submit_photo(p_player_id uuid, p_path text, p_thumb_path text)
returns public.photos
language plpgsql
set search_path = public
as $$
declare
  v_player public.players;
  v_max    integer;
  v_used   integer;
  v_photo  public.photos;
begin
  select * into v_player from players where id = p_player_id for update;
  if v_player.id is null or v_player.team_id is null then
    raise exception 'no_team';
  end if;

  select max_photos_per_player into v_max from settings where id;
  select count(*) into v_used from photos where player_id = p_player_id and status <> 'rejected';
  if v_used >= v_max then
    raise exception 'photo_limit';
  end if;

  insert into photos (player_id, team_id, path, thumb_path)
  values (p_player_id, v_player.team_id, p_path, p_thumb_path)
  returning * into v_photo;
  return v_photo;
end;
$$;

-- approve + ให้คะแนน: เพดานเป็นคะแนน ถ้าเหลือไม่พอให้เท่าที่เหลือ ถ้าเต็มแล้วไม่สร้าง event
-- คืนค่าคะแนนที่ให้จริง, null ถ้ารูปไม่ได้อยู่ในสถานะ pending
create or replace function public.approve_photo(p_photo_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_photo  public.photos;
  v_points integer;
  v_cap    integer;
  v_given  integer;
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
    select coalesce(sum(points), 0) into v_given from score_events
    where team_id = v_photo.team_id and kind = 'photo' and not voided;
    v_points := least(v_points, greatest(v_cap - v_given, 0));
  end if;

  if v_points <= 0 then
    return 0;
  end if;

  insert into score_events (team_id, points, kind, label, player_id, player_name, photo_id)
  select v_photo.team_id, v_points, 'photo', 'しゃしん', p.id, p.name, v_photo.id
  from players p where p.id = v_photo.player_id
  on conflict (photo_id) do nothing;

  return v_points;
end;
$$;

-- reject (ใช้ได้ทั้งรูป pending และรูปที่ approve ไปแล้ว): ยกเลิกคะแนนของรูปนั้นด้วย
create or replace function public.reject_photo(p_photo_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update photos set status = 'rejected', reviewed_at = now()
  where id = p_photo_id and status <> 'rejected';
  if not found then
    return false;
  end if;
  update score_events set voided = true where photo_id = p_photo_id;
  return true;
end;
$$;

revoke execute on function
  public.submit_photo(uuid, text, text),
  public.approve_photo(uuid),
  public.reject_photo(uuid)
from public, anon, authenticated;

grant execute on function
  public.submit_photo(uuid, text, text),
  public.approve_photo(uuid),
  public.reject_photo(uuid)
to service_role;

notify pgrst, 'reload schema';
