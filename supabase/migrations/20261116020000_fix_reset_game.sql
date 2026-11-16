-- reset_game: ตัด `restart identity` ออก (service_role ไม่ใช่เจ้าของ sequence จึง error)
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
