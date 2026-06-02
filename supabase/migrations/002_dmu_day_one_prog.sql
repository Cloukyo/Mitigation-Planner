alter table public.plans
  add column if not exists prog_notes jsonb default '{}'::jsonb;

alter table public.plan_timeline_events
  add column if not exists event_tag text;
