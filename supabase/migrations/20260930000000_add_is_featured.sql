-- Flag produk unggulan untuk landing page (maks. 8 kartu foto).
-- Dijaga tetap false oleh default; impor Excel tidak pernah menyentuh kolom ini.
alter table public.products
  add column if not exists is_featured boolean not null default false;
