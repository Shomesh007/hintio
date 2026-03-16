create table if not exists public.licenses (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  license_key text unique not null,
  plan text default 'pro',
  status text default 'active',
  created_at timestamp default now()
);
