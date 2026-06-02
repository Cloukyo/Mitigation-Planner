create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  encounter_template_id text,
  encounter_name text,
  share_slug text unique not null,
  visibility text check (visibility in ('private', 'unlisted', 'public')) default 'private',
  prog_notes jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner', 'editor', 'viewer')) not null,
  created_at timestamptz default now(),
  unique(plan_id, user_id)
);

create table if not exists public.plan_players (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  slot text,
  name text,
  job text,
  role text,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plan_timeline_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  source_event_id text,
  phase_id text,
  time_seconds numeric not null,
  display_time text,
  name text not null,
  ability_game_id int,
  damage_type text,
  target_type text,
  severity text,
  event_tag text,
  mitigation_relevant boolean default true,
  observed_damage jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plan_mitigation_placements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  player_id uuid references public.plan_players(id) on delete cascade,
  ability_id text not null,
  time_seconds numeric not null,
  locked boolean default false,
  notes text,
  source text default 'manual',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plan_common_usage_layers (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  source_type text,
  title text,
  enabled boolean default true,
  opacity numeric default 0.55,
  filters jsonb,
  timings jsonb not null,
  source_reports jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plan_import_sources (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade,
  source_type text,
  label text,
  url text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_players enable row level security;
alter table public.plan_timeline_events enable row level security;
alter table public.plan_mitigation_placements enable row level security;
alter table public.plan_common_usage_layers enable row level security;
alter table public.plan_import_sources enable row level security;

create or replace function public.is_plan_member(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.plan_members
    where plan_id = target_plan_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.plan_members
    where plan_id = target_plan_id and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create or replace function public.can_view_plan(target_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.plans
    where id = target_plan_id
      and (visibility in ('public', 'unlisted') or owner_id = auth.uid() or public.is_plan_member(target_plan_id))
  );
$$;

create policy "profiles read own" on public.profiles for select using (id = auth.uid());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());

create policy "plans read accessible" on public.plans for select using (
  visibility in ('public', 'unlisted') or owner_id = auth.uid() or public.is_plan_member(id)
);
create policy "plans insert authenticated" on public.plans for insert to authenticated with check (owner_id = auth.uid());
create policy "plans owner update" on public.plans for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "plans owner delete" on public.plans for delete using (owner_id = auth.uid());

create policy "members read plan" on public.plan_members for select using (public.can_view_plan(plan_id));
create policy "members owner manage insert" on public.plan_members for insert to authenticated with check (
  exists (select 1 from public.plans where id = plan_id and owner_id = auth.uid())
);
create policy "members owner manage update" on public.plan_members for update using (
  exists (select 1 from public.plans where id = plan_id and owner_id = auth.uid())
);
create policy "members owner manage delete" on public.plan_members for delete using (
  exists (select 1 from public.plans where id = plan_id and owner_id = auth.uid())
);

create policy "players read plan" on public.plan_players for select using (public.can_view_plan(plan_id));
create policy "players edit plan insert" on public.plan_players for insert to authenticated with check (public.can_edit_plan(plan_id));
create policy "players edit plan update" on public.plan_players for update using (public.can_edit_plan(plan_id));
create policy "players edit plan delete" on public.plan_players for delete using (public.can_edit_plan(plan_id));

create policy "events read plan" on public.plan_timeline_events for select using (public.can_view_plan(plan_id));
create policy "events edit plan insert" on public.plan_timeline_events for insert to authenticated with check (public.can_edit_plan(plan_id));
create policy "events edit plan update" on public.plan_timeline_events for update using (public.can_edit_plan(plan_id));
create policy "events edit plan delete" on public.plan_timeline_events for delete using (public.can_edit_plan(plan_id));

create policy "placements read plan" on public.plan_mitigation_placements for select using (public.can_view_plan(plan_id));
create policy "placements edit plan insert" on public.plan_mitigation_placements for insert to authenticated with check (public.can_edit_plan(plan_id));
create policy "placements edit plan update" on public.plan_mitigation_placements for update using (public.can_edit_plan(plan_id));
create policy "placements edit plan delete" on public.plan_mitigation_placements for delete using (public.can_edit_plan(plan_id));

create policy "common usage read plan" on public.plan_common_usage_layers for select using (public.can_view_plan(plan_id));
create policy "common usage edit plan insert" on public.plan_common_usage_layers for insert to authenticated with check (public.can_edit_plan(plan_id));
create policy "common usage edit plan update" on public.plan_common_usage_layers for update using (public.can_edit_plan(plan_id));
create policy "common usage edit plan delete" on public.plan_common_usage_layers for delete using (public.can_edit_plan(plan_id));

create policy "sources read plan" on public.plan_import_sources for select using (public.can_view_plan(plan_id));
create policy "sources edit plan insert" on public.plan_import_sources for insert to authenticated with check (public.can_edit_plan(plan_id));
create policy "sources edit plan update" on public.plan_import_sources for update using (public.can_edit_plan(plan_id));
create policy "sources edit plan delete" on public.plan_import_sources for delete using (public.can_edit_plan(plan_id));
