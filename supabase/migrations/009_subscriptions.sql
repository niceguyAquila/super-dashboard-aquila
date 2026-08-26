-- Global (brand-independent) tools & servers subscription inventory

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('tool', 'server')),
  vendor text,
  cost numeric,
  currency text not null default 'USD',
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly', 'one_time')),
  started_at date,
  renews_at date,
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'expired')),
  login_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_renews_at_idx
  on public.subscriptions (status, renews_at);

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_subscriptions_updated_at();

alter table public.subscriptions enable row level security;

create policy "Authenticated users full access subscriptions"
  on public.subscriptions for all to authenticated
  using (true) with check (true);
