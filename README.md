# Aquila Dashboard

Brand-scoped dashboard for **domain inventory** (Ahrefs sync + social signals) and **ADS performance** (manual spend / regs / deposits / CPR).

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Auth + Postgres + RLS)
- Ahrefs API v3 (server-side sync)
- Vercel Cron for daily freshness

## Setup

1. Create a Supabase project and run:
   - [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
   - [`supabase/migrations/002_profiles_auth.sql`](supabase/migrations/002_profiles_auth.sql)
   - [`supabase/migrations/003_ahrefs_detail_expansion.sql`](supabase/migrations/003_ahrefs_detail_expansion.sql)
   - [`supabase/migrations/004_ad_platforms.sql`](supabase/migrations/004_ad_platforms.sql)
2. Copy [`.env.example`](.env.example) to `.env.local` and fill in values (service role key is required for user creation).
3. In Supabase Auth → Providers, enable **Email** password sign-in. Disable public sign-ups in Auth settings if available.
4. Install and run:

```bash
npm install
npm run dev
```

5. Open [http://localhost:3000/login](http://localhost:3000/login). On first launch, create the **super admin** username/password. After that, only that admin can create more accounts under **Manage users**.

## Auth model

- Username + password only (no public sign up).
- Usernames are stored in `profiles` and authenticated via synthetic emails (`username@users.brandwork.local`) under the hood.
- Super admins can create users, reset passwords, and delete accounts at `/settings/users`.

## Ahrefs sync

- Manual: **Sync Ahrefs** on the domains list, or **Sync now** on a domain detail page.
- Scheduled: Vercel Cron hits `GET /api/ahrefs/sync` daily at 06:00 UTC (`vercel.json`). Set `CRON_SECRET` and `AHREFS_API_TOKEN`.

Sync caches metrics, top 50 anchors, and top 50 backlinks per domain to limit API credit use.

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Username/password login (or first-time super admin setup) |
| `/` | Brand picker |
| `/settings/brands` | Create / rename / delete brands |
| `/settings/users` | Super admin: create / reset / delete users |
| `/[brand]/domains` | Domain inventory |
| `/[brand]/domains/[id]` | Title, social signals, Ahrefs data |
| `/[brand]/ads` | ADS metrics + CPR (per ad platform) |

## ADS platforms

Each brand manages its own ad platforms (e.g. Propeller Ads, Rich Ads) on the ADS page. Only **active** platforms appear when adding entries. Spend, registrations, and deposits are logged **per platform per day**. Dashboard totals and the trend chart aggregate across platforms for the selected range.

## CPR

CPR is computed as `spend / registrations` (not stored). Average CPR on the ADS dashboard uses totals for the selected date range.
