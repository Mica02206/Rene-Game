-- Rene Game database schema and access policies.
-- Run this file once in Supabase Dashboard → SQL Editor.

create table public.game_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  high_score integer not null default 0 check (high_score >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  updated_at timestamptz not null default now()
);

alter table public.game_profiles enable row level security;
grant select, insert, update, delete on table public.game_profiles to authenticated;

create policy "Signed-in users can read leaderboard"
  on public.game_profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
  on public.game_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own profile"
  on public.game_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own profile"
  on public.game_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Create each player's stats when Supabase Auth creates an account.
create function public.create_game_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.game_profiles (user_id, display_name)
  values (new.id, 'Player ' || upper(left(replace(new.id::text, '-', ''), 4)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_game_profile
  after insert on auth.users
  for each row execute procedure public.create_game_profile();

-- Atomically keep the best score and add run points to the career total.
create function public.record_game_run(run_score integer)
returns void
language plpgsql
security invoker
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

grant execute on function public.record_game_run(integer) to authenticated;

-- Add this table to Realtime so profile and leaderboard subscriptions receive updates.
alter publication supabase_realtime add table public.game_profiles;
