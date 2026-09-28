-- Skema awal katalog produk + log impor
-- Dijalankan lewat Supabase SQL Editor atau: supabase db push

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Penanda peran admin. Diambil dari app_metadata JWT (auth.jwt()).
-- Alternatif berbasis tabel admin_users ada di bagian bawah file ini.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  kode_barang text not null unique,
  spesifikasi text not null,
  notes text,
  -- SRP disimpan dalam satuan ribu rupiah (17999 = Rp 17.999.000)
  srp numeric not null default 0,
  m1_vs_lama text,
  -- URL Cloudinary, indeks pertama adalah gambar utama.
  -- Tidak pernah disentuh oleh proses impor Excel.
  image_urls text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_is_active_idx on public.products (is_active);
create index if not exists products_kode_barang_trgm_idx
  on public.products using gin (kode_barang gin_trgm_ops);
create index if not exists products_spesifikasi_trgm_idx
  on public.products using gin (spesifikasi gin_trgm_ops);
create index if not exists products_srp_idx on public.products (srp);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.import_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  filename text not null,
  source text not null default 'admin',
  added_count integer not null default 0,
  changed_count integer not null default 0,
  deactivated_count integer not null default 0,
  deleted_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]',
  actor_id uuid,
  actor_email text
);

create index if not exists import_logs_created_at_idx
  on public.import_logs (created_at desc);

alter table public.products enable row level security;
alter table public.import_logs enable row level security;

drop policy if exists products_select_public on public.products;
create policy products_select_public
  on public.products for select
  to anon
  using (is_active);

drop policy if exists products_select_authenticated on public.products;
create policy products_select_authenticated
  on public.products for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists products_write_admin on public.products;
create policy products_write_admin
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists products_update_admin on public.products;
create policy products_update_admin
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_delete_admin on public.products;
create policy products_delete_admin
  on public.products for delete
  to authenticated
  using (public.is_admin());

drop policy if exists import_logs_admin on public.import_logs;
create policy import_logs_admin
  on public.import_logs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Alternatif penanda admin berbasis tabel (opsional, aktifkan bila tidak ingin
-- memakai app_metadata):
--
-- create table if not exists public.admin_users (
--   user_id uuid primary key references auth.users (id) on delete cascade,
--   created_at timestamptz not null default now()
-- );
-- alter table public.admin_users enable row level security;
-- create policy admin_users_self_read on public.admin_users
--   for select to authenticated using (user_id = auth.uid());
-- create or replace function public.is_admin()
-- returns boolean language sql stable security definer as $$
--   select exists (select 1 from public.admin_users where user_id = auth.uid());
-- $$;
