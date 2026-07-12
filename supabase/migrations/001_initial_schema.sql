-- Brand Work Dashboard schema
-- Run this in the Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

-- Brands
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Domains
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  hostname text not null,
  title text,
  notes text,
  ahrefs_last_synced_at timestamptz,
  ahrefs_sync_error text,
  created_at timestamptz not null default now(),
  unique (brand_id, hostname)
);

create index domains_brand_id_idx on public.domains (brand_id);

-- Social signal links per domain
create table public.domain_social_signals (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index domain_social_signals_domain_id_idx on public.domain_social_signals (domain_id);

-- Latest Ahrefs metrics snapshot (one row per domain, upserted on sync)
create table public.domain_ahrefs_metrics (
  domain_id uuid primary key references public.domains (id) on delete cascade,
  domain_rating numeric,
  url_rating numeric,
  backlinks bigint,
  refdomains bigint,
  organic_keywords bigint,
  organic_traffic bigint,
  fetched_at timestamptz not null default now()
);

-- Cached top anchors
create table public.domain_anchors (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  anchor text not null,
  backlinks bigint,
  refdomains bigint,
  first_seen date,
  last_seen date,
  created_at timestamptz not null default now()
);

create index domain_anchors_domain_id_idx on public.domain_anchors (domain_id);

-- Cached top backlinks (capped per domain in app logic)
create table public.domain_backlinks (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  url_from text not null,
  url_to text,
  anchor text,
  domain_rating_source numeric,
  url_rating_source numeric,
  is_dofollow boolean,
  first_seen date,
  last_seen date,
  created_at timestamptz not null default now()
);

create index domain_backlinks_domain_id_idx on public.domain_backlinks (domain_id);

-- Manual ADS performance entries
create table public.ad_entries (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  entry_date date not null,
  spend numeric(12, 2) not null default 0,
  registrations integer not null default 0,
  deposits integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (brand_id, entry_date)
);

create index ad_entries_brand_id_idx on public.ad_entries (brand_id);
create index ad_entries_entry_date_idx on public.ad_entries (entry_date);

-- RLS: any authenticated user can manage all rows (solo dashboard v1)
alter table public.brands enable row level security;
alter table public.domains enable row level security;
alter table public.domain_social_signals enable row level security;
alter table public.domain_ahrefs_metrics enable row level security;
alter table public.domain_anchors enable row level security;
alter table public.domain_backlinks enable row level security;
alter table public.ad_entries enable row level security;

create policy "Authenticated users full access brands"
  on public.brands for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access domains"
  on public.domains for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access social signals"
  on public.domain_social_signals for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access ahrefs metrics"
  on public.domain_ahrefs_metrics for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access anchors"
  on public.domain_anchors for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access backlinks"
  on public.domain_backlinks for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access ad entries"
  on public.ad_entries for all to authenticated
  using (true) with check (true);

-- Service role bypasses RLS for cron sync jobs by default
