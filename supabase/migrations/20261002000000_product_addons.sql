-- Add-on global untuk halaman produk: anti gores body & layar (matte/glossy).
-- Harga dalam RUPIAH PENUH (bukan satuan ribu seperti products.srp).
-- Kombinasinya tetap (4 baris); admin hanya mengubah harga & status aktif.

create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  kategori text not null check (kategori in ('body', 'layar')),
  tipe text not null check (tipe in ('matte', 'glossy')),
  harga numeric not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (kategori, tipe)
);

drop trigger if exists product_addons_set_updated_at on public.product_addons;
create trigger product_addons_set_updated_at
  before update on public.product_addons
  for each row execute function public.set_updated_at();

insert into public.product_addons (kategori, tipe, harga, is_active)
values
  ('body', 'matte', 0, true),
  ('body', 'glossy', 0, true),
  ('layar', 'matte', 0, true),
  ('layar', 'glossy', 0, true)
on conflict (kategori, tipe) do nothing;

alter table public.product_addons enable row level security;

drop policy if exists product_addons_select_public on public.product_addons;
create policy product_addons_select_public
  on public.product_addons for select
  to anon
  using (is_active);

drop policy if exists product_addons_select_authenticated on public.product_addons;
create policy product_addons_select_authenticated
  on public.product_addons for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists product_addons_update_admin on public.product_addons;
create policy product_addons_update_admin
  on public.product_addons for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
