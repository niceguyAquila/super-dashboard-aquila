-- Per-brand ad platforms + platform-scoped ADS entries

create table public.ad_platforms (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);

create index ad_platforms_brand_id_idx on public.ad_platforms (brand_id);

alter table public.ad_platforms enable row level security;

create policy "Authenticated users full access ad platforms"
  on public.ad_platforms for all to authenticated
  using (true) with check (true);

-- Attach platform to existing entries (nullable until backfill)
alter table public.ad_entries
  add column platform_id uuid references public.ad_platforms (id) on delete cascade;

-- Backfill: one "General" platform per brand that already has entries
insert into public.ad_platforms (brand_id, name, is_active)
select distinct brand_id, 'General', true
from public.ad_entries;

update public.ad_entries e
set platform_id = p.id
from public.ad_platforms p
where e.brand_id = p.brand_id
  and p.name = 'General'
  and e.platform_id is null;

alter table public.ad_entries
  alter column platform_id set not null;

alter table public.ad_entries
  drop constraint if exists ad_entries_brand_id_entry_date_key;

alter table public.ad_entries
  add constraint ad_entries_platform_id_entry_date_key unique (platform_id, entry_date);

create index ad_entries_platform_id_idx on public.ad_entries (platform_id);
