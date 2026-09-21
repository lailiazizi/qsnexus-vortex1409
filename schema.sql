-- QS Nexus: cloud tables for Stage A.
-- Run this once in Supabase -> SQL Editor. Safe to run more than once.
-- (Assumes the public "markers" bucket and its upload policy already exist.)

create table if not exists public.projects (
  project_id  text primary key,                  -- same id the app uses in the URL (/workspace/<id>)
  components  jsonb not null default '[]'::jsonb, -- the 3D model
  calibration jsonb,                              -- drawing scale / calibration
  marker_path text,                               -- file path inside the "markers" bucket
  marker_name text,                               -- original file name
  zpt_path    text,                               -- reserved for Stage B (trained Zappar target)
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects read"   on public.projects;
drop policy if exists "projects insert" on public.projects;
drop policy if exists "projects update" on public.projects;

-- OPEN policies for testing: anyone holding the public anon key can read and write.
-- Before real student use, add Supabase Auth and restrict these to the project owner.
create policy "projects read"   on public.projects for select using (true);
create policy "projects insert" on public.projects for insert with check (true);
create policy "projects update" on public.projects for update using (true) with check (true);

-- Optional clean-up: the earlier test table is no longer used.
-- drop table if exists public.markers;
