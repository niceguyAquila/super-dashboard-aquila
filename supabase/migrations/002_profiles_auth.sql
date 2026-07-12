-- Profiles for username/password auth (no public signup)
-- Usernames map to synthetic emails: {username}@users.brandwork.local

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null default 'user' check (role in ('super_admin', 'user')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

-- Authenticated users can read all profiles (needed for admin UI + display)
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated
  using (true);

-- Users can update only their own non-role fields via app; role changes go through service role
create policy "Users can update own profile display"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts/deletes only via service role (admin create-user flow)
