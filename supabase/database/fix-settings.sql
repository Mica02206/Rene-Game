-- Repairs per-user profile permissions and installs safe settings/score RPCs.
-- Run this in Supabase Dashboard → SQL Editor → New query.

alter table public.game_profiles enable row level security;
grant select, insert, update, delete on table public.game_profiles to authenticated;

drop policy if exists "Users can update their own profile" on public.game_profiles;
create policy "Users can update their own profile"
  on public.game_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.reset_game_progress()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
begin
  if player_id is null then
    raise exception 'Authentication required';
  end if;
  update public.game_profiles
  set high_score = 0, total_points = 0, updated_at = now()
  where user_id = player_id;
  if not found then
    raise exception 'Player profile not found';
  end if;
end;
$$;

-- Keep score writes atomic and scoped to the caller even if table policies vary.
create or replace function public.record_game_run(run_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
begin
  if player_id is null then
    raise exception 'Authentication required';
  end if;
  if run_score < 0 or run_score > 1000000 then
    raise exception 'Invalid score';
  end if;
  insert into public.game_profiles (user_id, display_name, high_score, total_points, updated_at)
  values (
    player_id,
    'Player ' || upper(left(replace(player_id::text, '-', ''), 4)),
    run_score,
    run_score,
    now()
  )
  on conflict (user_id) do update set
    high_score = greatest(public.game_profiles.high_score, excluded.high_score),
    total_points = public.game_profiles.total_points + excluded.total_points,
    updated_at = now();
end;
$$;

revoke all on function public.reset_game_progress() from public, anon;
revoke all on function public.record_game_run(integer) from public, anon;
grant execute on function public.reset_game_progress() to authenticated;
grant execute on function public.record_game_run(integer) to authenticated;

create or replace function public.set_player_name(new_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
  clean_name text := btrim(coalesce(new_name, ''));
begin
  if player_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 20 then
    raise exception 'Name must be between 2 and 20 characters';
  end if;
  update public.game_profiles
  set display_name = clean_name, updated_at = now()
  where user_id = player_id;
  if not found then
    raise exception 'Player profile not found';
  end if;
end;
$$;

revoke all on function public.set_player_name(text) from public, anon;
grant execute on function public.set_player_name(text) to authenticated;
