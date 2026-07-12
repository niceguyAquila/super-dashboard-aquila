-- Add social_links field alongside existing label + url

alter table public.brand_social_signals
  add column social_links text not null default '';
