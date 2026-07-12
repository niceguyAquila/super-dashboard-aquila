-- Brand-level social signals (moved off domains)

create table public.brand_social_signals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index brand_social_signals_brand_id_idx on public.brand_social_signals (brand_id);

alter table public.brand_social_signals enable row level security;

create policy "Authenticated users full access brand social signals"
  on public.brand_social_signals for all to authenticated
  using (true) with check (true);

-- Migrate existing domain-scoped signals onto their brand
insert into public.brand_social_signals (id, brand_id, label, url, created_at)
select s.id, d.brand_id, s.label, s.url, s.created_at
from public.domain_social_signals s
join public.domains d on d.id = s.domain_id;

drop policy if exists "Authenticated users full access social signals" on public.domain_social_signals;
drop table public.domain_social_signals;
