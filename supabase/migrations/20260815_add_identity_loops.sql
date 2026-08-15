create table if not exists public.identity_loops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loop_date date not null,
  identity_key text not null,
  identity_title text not null,
  repetitions text[] not null default '{}',
  proof text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, loop_date, identity_key)
);

alter table public.identity_loops enable row level security;

create policy "users own identity loops" on public.identity_loops
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists identity_loops_user_date_idx on public.identity_loops(user_id, loop_date);
