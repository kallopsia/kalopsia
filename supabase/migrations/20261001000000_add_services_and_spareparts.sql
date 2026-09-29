-- Jasa & sparepart: install ulang Windows, install software, sparepart.
-- Harga pada tabel-tabel ini disimpan dalam RUPIAH PENUH (bukan satuan ribu
-- seperti products.srp), contoh: 150000 = Rp 150.000.
-- Dijalankan lewat Supabase SQL Editor atau: supabase db push

-- 1) Jasa install ulang Windows (satu baris konfigurasi, diubah dari admin)
create table if not exists public.services_windows_install (
  id uuid primary key default gen_random_uuid(),
  harga numeric not null default 0,
  deskripsi text,
  updated_at timestamptz not null default now()
);

drop trigger if exists services_windows_install_set_updated_at on public.services_windows_install;
create trigger services_windows_install_set_updated_at
  before update on public.services_windows_install
  for each row execute function public.set_updated_at();

insert into public.services_windows_install (harga, deskripsi)
select 0, null
where not exists (select 1 from public.services_windows_install);

-- 2) Jasa install software (katalog)
create table if not exists public.software_services (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null unique,
  image_url text,
  harga numeric not null default 0,
  spesifikasi_minimum text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists software_services_is_active_idx on public.software_services (is_active);
create index if not exists software_services_slug_idx on public.software_services (slug);

drop trigger if exists software_services_set_updated_at on public.software_services;
create trigger software_services_set_updated_at
  before update on public.software_services
  for each row execute function public.set_updated_at();

-- 3) Sparepart (katalog)
create table if not exists public.spareparts (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null unique,
  image_url text,
  harga numeric not null default 0,
  deskripsi text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spareparts_is_active_idx on public.spareparts (is_active);
create index if not exists spareparts_slug_idx on public.spareparts (slug);

drop trigger if exists spareparts_set_updated_at on public.spareparts;
create trigger spareparts_set_updated_at
  before update on public.spareparts
  for each row execute function public.set_updated_at();

-- Row level security: publik hanya membaca baris aktif; tulis/hapus cuma admin.
alter table public.services_windows_install enable row level security;
alter table public.software_services enable row level security;
alter table public.spareparts enable row level security;

drop policy if exists services_windows_install_select_public on public.services_windows_install;
create policy services_windows_install_select_public
  on public.services_windows_install for select
  to anon
  using (true);

drop policy if exists services_windows_install_select_authenticated on public.services_windows_install;
create policy services_windows_install_select_authenticated
  on public.services_windows_install for select
  to authenticated
  using (true);

drop policy if exists services_windows_install_write_admin on public.services_windows_install;
create policy services_windows_install_write_admin
  on public.services_windows_install for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists services_windows_install_update_admin on public.services_windows_install;
create policy services_windows_install_update_admin
  on public.services_windows_install for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists software_services_select_public on public.software_services;
create policy software_services_select_public
  on public.software_services for select
  to anon
  using (is_active);

drop policy if exists software_services_select_authenticated on public.software_services;
create policy software_services_select_authenticated
  on public.software_services for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists software_services_insert_admin on public.software_services;
create policy software_services_insert_admin
  on public.software_services for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists software_services_update_admin on public.software_services;
create policy software_services_update_admin
  on public.software_services for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists software_services_delete_admin on public.software_services;
create policy software_services_delete_admin
  on public.software_services for delete
  to authenticated
  using (public.is_admin());

drop policy if exists spareparts_select_public on public.spareparts;
create policy spareparts_select_public
  on public.spareparts for select
  to anon
  using (is_active);

drop policy if exists spareparts_select_authenticated on public.spareparts;
create policy spareparts_select_authenticated
  on public.spareparts for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists spareparts_insert_admin on public.spareparts;
create policy spareparts_insert_admin
  on public.spareparts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists spareparts_update_admin on public.spareparts;
create policy spareparts_update_admin
  on public.spareparts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists spareparts_delete_admin on public.spareparts;
create policy spareparts_delete_admin
  on public.spareparts for delete
  to authenticated
  using (public.is_admin());
