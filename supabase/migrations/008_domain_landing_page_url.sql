-- Landing page URL per domain (inventory + detail)

alter table public.domains
  add column if not exists landing_page_url text;
