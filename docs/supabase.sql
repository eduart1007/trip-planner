-- Database setup for Trip Planner (run once in the Supabase SQL editor of a NEW project)

-- Saved trips (private to each user)
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "Users read their own trips" on public.trips
  for select using (auth.uid() = user_id);
create policy "Users add their own trips" on public.trips
  for insert with check (auth.uid() = user_id);
create policy "Users update their own trips" on public.trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their own trips" on public.trips
  for delete using (auth.uid() = user_id);

-- Points, streaks and public name
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null default 'Traveler' check (char_length(display_name) between 1 and 30),
  points bigint not null default 0,
  stops integer not null default 0,
  trips integer not null default 0,
  walked_meters double precision not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read their own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users add their own profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "Users update their own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Server rules: progress never goes down, and points cannot grow faster than a person can travel
create or replace function public.guard_progress() returns trigger
language plpgsql as $$
declare
  age_hours numeric;
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    age_hours := 0;
  else
    new.created_at := old.created_at;
    age_hours := extract(epoch from (now() - old.created_at)) / 3600;
    new.stops := greatest(old.stops, new.stops);
    new.trips := greatest(old.trips, new.trips);
    new.walked_meters := greatest(old.walked_meters, new.walked_meters);
    new.best_streak := greatest(old.best_streak, new.best_streak);
  end if;

  -- 20,000 points to start with plus about 3,000 per hour of account age
  new.points := least(new.points, 20000 + floor(3000 * age_hours)::bigint);
  if tg_op = 'UPDATE' then
    new.points := greatest(old.points, new.points);
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.guard_progress();

-- Leaderboard: names and points only, never emails or ids
create or replace function public.leaderboard(limit_count integer default 20)
returns table (rank bigint, display_name text, points bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select rank() over (order by p.points desc), p.display_name, p.points, (p.user_id = auth.uid())
  from public.profiles p
  order by p.points desc
  limit least(greatest(limit_count, 1), 50);
$$;

create or replace function public.my_rank() returns bigint
language sql stable security definer set search_path = public as $$
  select case when me.points is null then null
         else 1 + (select count(*) from public.profiles p where p.points > me.points) end
  from (select (select points from public.profiles where user_id = auth.uid()) as points) as me;
$$;

grant execute on function public.leaderboard(integer) to anon, authenticated;
grant execute on function public.my_rank() to anon, authenticated;
