-- Poin 3: harga add-on per ukuran layar + snapshot transaksi (order intent).

-- 1) Kolom harga per ukuran layar pada product_addons.
--    `harga` (default lama) tetap ada sebagai fallback bila produk belum
--    terkategori atau harga ukuran tertentu belum ditetapkan (0).
alter table public.product_addons add column if not exists harga_14 numeric not null default 0;
alter table public.product_addons add column if not exists harga_15 numeric not null default 0;
alter table public.product_addons add column if not exists harga_16 numeric not null default 0;

-- 2) Tabel order_intents: merekam snapshot harga saat pembeli menekan tombol
--    WhatsApp (checkout lewat WA, tidak ada keranjang/tabel pesanan formal).
create table if not exists public.order_intents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  jenis text not null default 'produk' check (jenis in ('produk', 'software', 'sparepart', 'pesan')),
  product_id uuid references public.products (id) on delete set null,
  kode text,
  nama text,
  slug text,
  screen_kategori text,
  harga_produk numeric,
  addons jsonb not null default '[]'::jsonb,
  addon_total numeric not null default 0,
  estimated_total numeric
);

create index if not exists order_intents_created_at_idx
  on public.order_intents (created_at desc);

alter table public.order_intents enable row level security;

-- Ditulis oleh proses server (service role, bypass RLS). Hanya admin yang baca.
drop policy if exists order_intents_admin_select on public.order_intents;
create policy order_intents_admin_select
  on public.order_intents
  for select
  using (public.is_admin());
