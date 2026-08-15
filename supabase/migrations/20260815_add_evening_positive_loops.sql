alter table public.daily_logs
  add column if not exists evening_positive_loops text[] default '{}';
