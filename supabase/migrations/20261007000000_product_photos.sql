-- Sinkronisasi foto produk dari Cloudinary.
-- Dua tabel baru, keduanya tidak menyentuh products.image_urls:
--   product_photo_folders  = pemetaan SKU → nama folder (sumber: Excel "Pemetaan SKU")
--   product_photos         = hasil sinkron berupa public_id (bukan URL panjang)
-- Foto yang ditempel manual admin tetap hidup di products.image_urls dan
-- tidak pernah ditimpa oleh proses sinkron.

create table if not exists public.product_photo_folders (
  -- Kode barang tanpa prefix PR-LAP-<BRAND>- (sama seperti products.kode_barang).
  kode_barang text primary key,
  -- Nama folder persis seperti kolom B sheet "Pemetaan SKU" (dicocokkan
  -- tanpa memperhatikan besar/kecil huruf saat sinkron).
  folder text not null,
  sumber text not null default 'xlsx' check (sumber in ('xlsx', 'csv', 'manual')),
  updated_at timestamptz not null default now()
);

drop trigger if exists product_photo_folders_set_updated_at on public.product_photo_folders;
create trigger product_photo_folders_set_updated_at
  before update on public.product_photo_folders
  for each row execute function public.set_updated_at();

-- Pemetaan internals: pengunjung tidak pernah membutuhkannya.
alter table public.product_photo_folders enable row level security;

drop policy if exists product_photo_folders_admin_all on public.product_photo_folders;
create policy product_photo_folders_admin_all
  on public.product_photo_folders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- public_id Cloudinary, mis. "laptop/PR-LAP-AC-A715-59G-516S/1".
  public_id text not null,
  -- 1 = foto utama (nomor berkas di Cloudinary), urut numerik ascending.
  posisi integer not null,
  folder text,
  sumber text not null default 'sync' check (sumber in ('sync', 'manual')),
  synced_at timestamptz not null default now(),
  unique (product_id, public_id)
);

create index if not exists product_photos_product_posisi_idx
  on public.product_photos (product_id, posisi);

alter table public.product_photos enable row level security;

-- Baca: publik, tetapi hanya untuk produk aktif (sama seperti products).
drop policy if exists product_photos_select_public on public.product_photos;
create policy product_photos_select_public
  on public.product_photos for select
  to anon
  using (
    exists (
      select 1 from public.products p
      where p.id = product_photos.product_id and p.is_active
    )
  );

drop policy if exists product_photos_select_authenticated on public.product_photos;
create policy product_photos_select_authenticated
  on public.product_photos for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_photos.product_id and p.is_active
    )
  );

-- Tulis: hanya admin (jalur sinkron memakai service role di server).
drop policy if exists product_photos_insert_admin on public.product_photos;
create policy product_photos_insert_admin
  on public.product_photos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists product_photos_update_admin on public.product_photos;
create policy product_photos_update_admin
  on public.product_photos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_photos_delete_admin on public.product_photos;
create policy product_photos_delete_admin
  on public.product_photos for delete
  to authenticated
  using (public.is_admin());
