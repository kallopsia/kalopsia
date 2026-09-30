-- Nama tampilan produk, terpisah dari teks spesifikasi.
-- Kosong / null = tampilan fallback ke spesifikasi (perilaku lama), jadi
-- tidak ada produk yang mendadak kehilangan judul setelah migrasi ini.

alter table public.products add column if not exists nama_produk text;
