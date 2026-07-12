-- Track last modify time on brand social signals

alter table public.brand_social_signals
  add column updated_at timestamptz not null default now();

update public.brand_social_signals
set updated_at = created_at
where updated_at is distinct from created_at;

create or replace function public.set_brand_social_signals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger brand_social_signals_set_updated_at
  before update on public.brand_social_signals
  for each row
  execute function public.set_brand_social_signals_updated_at();
