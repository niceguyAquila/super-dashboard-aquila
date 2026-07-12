-- Expand Ahrefs metrics + add refdomains / organic keywords / top pages
-- Also store spam / link type / traffic on cached backlinks

alter table public.domain_ahrefs_metrics
  add column if not exists organic_keywords_top3 bigint,
  add column if not exists organic_cost bigint,
  add column if not exists paid_keywords bigint,
  add column if not exists paid_traffic bigint,
  add column if not exists paid_pages bigint,
  add column if not exists paid_cost bigint;

alter table public.domain_backlinks
  add column if not exists is_spam boolean,
  add column if not exists link_type text,
  add column if not exists traffic bigint;

create table if not exists public.domain_refdomains (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  refdomain text not null,
  domain_rating numeric,
  links_to_target bigint,
  dofollow_links bigint,
  traffic_domain bigint,
  is_spam boolean,
  first_seen date,
  last_seen date,
  created_at timestamptz not null default now()
);

create index if not exists domain_refdomains_domain_id_idx
  on public.domain_refdomains (domain_id);

create table if not exists public.domain_organic_keywords (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  keyword text not null,
  best_position integer,
  volume bigint,
  traffic bigint,
  keyword_difficulty integer,
  ranking_url text,
  created_at timestamptz not null default now()
);

create index if not exists domain_organic_keywords_domain_id_idx
  on public.domain_organic_keywords (domain_id);

create table if not exists public.domain_top_pages (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  url text not null,
  traffic bigint,
  keywords bigint,
  top_keyword text,
  top_keyword_volume bigint,
  referring_domains bigint,
  url_rating numeric,
  traffic_value bigint,
  created_at timestamptz not null default now()
);

create index if not exists domain_top_pages_domain_id_idx
  on public.domain_top_pages (domain_id);

alter table public.domain_refdomains enable row level security;
alter table public.domain_organic_keywords enable row level security;
alter table public.domain_top_pages enable row level security;

create policy "Authenticated users full access refdomains"
  on public.domain_refdomains for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access organic keywords"
  on public.domain_organic_keywords for all to authenticated
  using (true) with check (true);

create policy "Authenticated users full access top pages"
  on public.domain_top_pages for all to authenticated
  using (true) with check (true);
