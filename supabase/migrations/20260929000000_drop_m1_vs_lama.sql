-- Kolom m1_vs_lama tidak lagi dipakai di mana pun (storefront, admin, parser Excel).
-- Menjalankan migrasi ini menghapus nilai historisnya secara permanen.
alter table public.products drop column if exists m1_vs_lama;
