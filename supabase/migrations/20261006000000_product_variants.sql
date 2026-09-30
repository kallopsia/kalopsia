-- Poin 4+5: varian warna, stok, dan pengelompokan produk.
--
-- Kolom-kolom ini berada di tabel `products` (bukan tabel admin-only) karena
-- varian warna, harga, stok, dan URL grup memang ditampilkan ke pembeli.
-- Yang bersifat administratif (sumber deteksi warna, tanda duplikat) ikut di
-- sini tetapi tidak pernah dipakai sebagai rahasia; hanya memandu tampilan.

-- Stok per varian. NULL = tidak dilacak (dianggap tersedia); 0 = habis
-- (storefront menampilkan "tidak tersedia", varian tetap terlihat, tak disembunyikan).
alter table public.products add column if not exists stok integer;

-- Warna hasil deteksi/override admin.
--   warna_kode  : kode asli untuk tampilan (mis. "SPACE BLK").
--   warna_canon : bentuk kanonik untuk pengelompokan/dedup (mis. "GREY").
--   warna_source: 'auto' (dari spesifikasi) | 'manual' (override admin, tak ditimpa).
alter table public.products add column if not exists warna_kode text;
alter table public.products add column if not exists warna_canon text;
alter table public.products add column if not exists warna_source text not null default 'auto'
  check (warna_source in ('auto', 'manual'));

-- Slug kanonik grup varian. NULL = produk tunggal (tidak digabung).
-- Semua anggota grup berbagi group_slug = slug produk perwakilan (kode_barang terendah).
alter table public.products add column if not exists group_slug text;

-- Ditandai true bila ada >1 produk dengan kunci grup + warna kanonik yang sama
-- (duplikat yang perlu ditinjau admin; TIDAK digabung otomatis).
alter table public.products add column if not exists duplikat_warna boolean not null default false;

-- Index untuk pengambilan anggota grup & tinjauan duplikat di admin.
create index if not exists products_group_slug_idx on public.products (group_slug);
create index if not exists products_duplikat_warna_idx on public.products (duplikat_warna)
  where duplikat_warna = true;
