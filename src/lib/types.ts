export type UserRole = "super_admin" | "user";

export type Profile = {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  created_by: string | null;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Domain = {
  id: string;
  brand_id: string;
  hostname: string;
  title: string | null;
  notes: string | null;
  ahrefs_last_synced_at: string | null;
  ahrefs_sync_error: string | null;
  created_at: string;
};

export type DomainSocialSignal = {
  id: string;
  domain_id: string;
  label: string;
  url: string;
  created_at: string;
};

export type DomainAhrefsMetrics = {
  domain_id: string;
  domain_rating: number | null;
  url_rating: number | null;
  backlinks: number | null;
  refdomains: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  fetched_at: string;
};

export type DomainAnchor = {
  id: string;
  domain_id: string;
  anchor: string;
  backlinks: number | null;
  refdomains: number | null;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
};

export type DomainBacklink = {
  id: string;
  domain_id: string;
  url_from: string;
  url_to: string | null;
  anchor: string | null;
  domain_rating_source: number | null;
  url_rating_source: number | null;
  is_dofollow: boolean | null;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
};

export type AdEntry = {
  id: string;
  brand_id: string;
  entry_date: string;
  spend: number;
  registrations: number;
  deposits: number;
  notes: string | null;
  created_at: string;
};

export type DomainWithMetrics = Domain & {
  domain_ahrefs_metrics: DomainAhrefsMetrics | null;
  domain_social_signals: DomainSocialSignal[];
};
