# Panduan Setup — KALOPSIA TECH

Dokumen ini menjelaskan cara menjalankan proyek dari nol: membuat database Supabase,
menjalankan migrasi SQL, membuat user admin pertama, menyiapkan Cloudinary, mengisi
data awal dari Excel, mengisi foto produk dari folder Cloudinary, dan alur kerja
bulanan memperbarui katalog.

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + RLS)
+ Cloudinary (gambar produk) + SheetJS `xlsx` (parsing Excel).

---

## 0. Prasyarat

- Node.js 18.17 atau lebih baru
- Akun [Supabase](https://supabase.com)
- Akun [Cloudinary](https://cloudinary.com) (opsional, tapi dibutuhkan untuk mengunggah gambar)
- File Excel katalog, contoh: `PL_26_SEPT.xlsx` (sheet `LAPTOP`)
- File Excel pemetaan foto, contoh: `Daftar_Folder_Foto_Laptop.xlsx` (sheet `Pemetaan SKU`)
  — hanya kalau mau mengisi foto massal (lihat bagian 7)

Lalu pasang dependency:

```bash
npm install
```

---

## 1. Membuat project Supabase

1. Masuk ke https://supabase.com/dashboard → **New project**.
2. Isi nama project, password database, dan region terdekat (mis. `ap-southeast-1` / Singapore).
3. Tunggu provisioning selesai (±2 menit).
4. Buka **Project Settings → API**, catat tiga nilai berikut:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**rahasia, jangan dibagikan**)

---

## 2. Menjalankan migrasi SQL

Jalankan semua file di `supabase/migrations/` **berurutan** (nama file = urutan waktu):

| File | Isi |
| --- | --- |
| `20260928000000_init.sql` | Skema awal: ekstensi, `is_admin()`, `products`, `import_logs`, index, trigger, RLS |
| `20260929000000_drop_m1_vs_lama.sql` | Buang kolom `m1_vs_lama` yang tidak dipakai |
| `20260930000000_add_is_featured.sql` | Kolom `is_featured` untuk produk unggulan di landing page |
| `20261001000000_add_services_and_spareparts.sql` | Tabel `services_windows_install`, `software_services`, `spareparts` + RLS |
| `20261002000000_product_addons.sql` | Tabel `product_addons` (anti gores body/layar, matte/glossy) + seed 4 baris + RLS |
| `20261003000000_add_nama_produk.sql` | Kolom `nama_produk` (judul tampilan, opsional) di `products` |
| `20261004000000_product_screen_info.sql` | Tabel `product_screen_info` (kategori layar 14/15/16/belum, admin-only RLS) |
| `20261005000000_addon_price_per_screen_and_order_intents.sql` | Kolom `harga_14/15/16` di `product_addons` + tabel `order_intents` (snapshot harga saat klik WA) |
| `20261006000000_product_variants.sql` | Kolom varian di `products`: `stok`, `warna_kode`, `warna_canon`, `warna_source`, `group_slug`, `duplikat_warna` + index |
| `20261007000000_product_photos.sql` | Tabel `product_photo_folders` (pemetaan SKU→folder, admin-only RLS) + `product_photos` (`public_id`, posisi, folder, sumber) + index |

Isi `20260928000000_init.sql`:

- ekstensi `pgcrypto` (untuk `gen_random_uuid()`) dan `pg_trgm` (pencarian teks fuzzy)
- fungsi `public.is_admin()` — membaca `auth.jwt() -> 'app_metadata' ->> 'role'`
- tabel `products` (termasuk `image_urls text[]` dan trigger `updated_at`)
- tabel `import_logs` (riwayat impor Excel)
- index: `is_active`, trigram pada `kode_barang` dan `spesifikasi`, serta `srp`
- Row Level Security + kebijakan akses

### Cara A — lewat SQL Editor (paling mudah)

1. Dashboard Supabase → **SQL Editor** → **New query**.
2. Salin seluruh isi `supabase/migrations/20260928000000_init.sql`.
3. Klik **Run**. Pastikan output `Success. No rows returned`.
4. Ulangi untuk file migrasi berikutnya, berurutan.

### Cara B — lewat Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

### Verifikasi

Buka **Table Editor**, seharusnya ada tabel `products` dan `import_logs`.
Cek juga **Authentication → Policies**: tabel `products` punya policy
`products_select_public`, `products_select_authenticated`, `products_write_admin`,
`products_update_admin`, `products_delete_admin`.

---

## 3. Membuat user admin pertama

Role admin ditentukan oleh `app_metadata.role = 'admin'` pada user Auth Supabase
(lihat fungsi `is_admin()` di migrasi).

1. Dashboard Supabase → **Authentication → Users → Add user → Create new user**.
   Isi email dan password, centang **Auto Confirm User**.
2. Salin **User UID** yang muncul, lalu jalankan SQL berikut di **SQL Editor**
   (ganti email dengan email admin yang baru dibuat):

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
where email = 'admin@tokokamu.com';

-- pastikan berhasil
select email, raw_app_meta_data ->> 'role' as role
from auth.users;
```

Kolom `role` harus bernilai `admin`.

> Alternatif tanpa `app_metadata`: migrasi menyediakan versi `is_admin()` berbasis tabel
> `admin_users`. Jika lebih suka cara itu, buka blok komentar `admin_users` di bagian bawah
> file migrasi dan comment out versi `app_metadata`.

**Menambah admin lain**: ulangi langkah 1–2 untuk setiap email baru.

---

## 4. Menyiapkan Cloudinary

Gambar produk disimpan di Cloudinary dan **hanya dikelola dari halaman admin**,
tidak pernah dari Excel.

Ada dua mode unggah, pilih salah satu:

### Mode unsigned (paling cepat dicoba)

1. Dashboard Cloudinary → **Settings → Upload → Upload presets**.
2. **Add upload preset**:
   - Nama: `notebook-archive`
   - **Signing Mode: Unsigned**
   - Folder: `notebook-archive`
3. Simpan, lalu catat nama preset-nya.
4. Isi env:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<nama cloud kamu>
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=notebook-archive
   ```

### Mode signed (lebih aman, direkomendasikan untuk produksi)

1. Dashboard Cloudinary → **Settings → API Keys**, catat `API Key` dan `API Secret`.
2. Isi env:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<nama cloud kamu>
   CLOUDINARY_API_KEY=<api key>
   CLOUDINARY_API_SECRET=<api secret>
   ```
3. Admin akan otomatis memakai signed upload melalui endpoint `/api/cloudinary/sign`.
   `CLOUDINARY_API_SECRET` hanya dibaca di server dan tidak pernah dikirim ke browser.
4. Mode signed **wajib** kalau mau memakai **sinkron foto massal** (bagian 7): halaman
   `/admin/photos` memanggil Cloudinary Admin API untuk mendaftar folder/aset, dan itu
   butuh `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`.

Validasi URL: form admin hanya menerima URL `https://res.cloudinary.com/<CLOUD_NAME>/...`,
sehingga tidak bisa disisipi domain gambar lain.

---

## 5. Mengisi environment variables

Salin `.env.example` menjadi `.env.local`, lalu isi semua nilainya:

```bash
cp .env.example .env.local
```

```ini
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=namacloud
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=notebook-archive
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

WHATSAPP_NUMBER=6281234567890
```

File `.env*` sudah masuk `.gitignore` (kecuali `.env.example`), jadi tidak akan ikut ter-commit.

> `SUPABASE_SERVICE_ROLE_KEY` hanya dibaca oleh kode server (`lib/supabase/service.ts`,
> route handler `/api/admin/*`, dan script seed). Tidak ada komponen client yang menerimanya.

---

## 6. Menjalankan seed (isi data awal dari Excel)

Taruh file Excel di root proyek (nama default: `PL_26_SEPT.xlsx`), lalu:

```bash
npm run db:seed
```

Script akan:

1. Membaca **hanya** sheet `LAPTOP`. Sheet lain (TELCO, PC HOM ELE, SOF COM SUP, dst.) diabaikan.
2. Membaca header baris pertama: `KODEBARANG, SPESIFIKASI, NOTES, SRP, M1, M1 vs LAMA`.
   **Kolom `M1` dan `M1 vs LAMA` diabaikan total** — tidak disimpan dan tidak ditampilkan
   di mana pun.
3. Memvalidasi tiap baris dengan zod. Baris tidak valid dilaporkan (nomor baris + alasan)
   tanpa menggagalkan seluruh impor.
4. Menghitung diff terhadap isi database, lalu upsert ke Supabase (batch 500 baris)
   dan menulis satu baris ke `import_logs`.

Opsi:

```bash
# file lain / folder lain
npm run db:seed -- "D:/katalog/PL_OKT.xlsx"

# perlakukan produk yang hilang dari file sebagai "biarkan" (default: nonaktifkan)
npm run db:seed -- --missing=keep
```

**Jumlah produk saat ini: 354 baris valid dari sheet `LAPTOP`** (0 error).

### Memetakan URL gambar lama dari Google Spreadsheet

Spreadsheet lama menyimpan URL gambar, tetapi banyak di antaranya sudah 404, sehingga
tidak ikut dipindahkan otomatis (`image_urls` hasil seed adalah `[]`). Gambar diisi lewat
admin: `/admin/products` → **Ubah** → bagian *Gambar produk* → unggah file atau tempel URL
Cloudinary, lalu atur urutan (gambar pertama = gambar utama).

Impor Excel tidak pernah menyentuh `image_urls`; gambar hanya dikelola dari admin.
Untuk mengisi foto banyak SKU sekaligus, gunakan sinkron dari folder Cloudinary
(bagian 7) alih-alih satu-satu.

---

## 7. Mengisi foto produk dari Cloudinary

Untuk katalog dengan ratusan SKU, foto diisi massal dari folder Cloudinary, bukan satu-satu
lewat form. Halaman **Foto** (`/admin/photos`) membaca pemetaan **SKU → folder** dan menuliskan
hasilnya sebagai `public_id` ke tabel `product_photos`.

Yang perlu diketahui sebelum mulai:

- **Sumber kebenaran pemetaan** adalah sheet `Pemetaan SKU` (kolom A `KODEBARANG`, kolom B
  `Nama Folder`) — contoh `Daftar_Folder_Foto_Laptop.xlsx`. Sistem **tidak pernah** menebak
  folder dari kode barang atau nama produk.
- **Satu folder boleh dipakai banyak SKU** (mis. warna berbeda dengan foto sama).
- **Struktur folder** di Cloudinary: `{PREFIX}/{Nama Folder}/…foto…` dengan `PREFIX = laptop`
  (konstanta `CLOUDINARY_FOLDER_PREFIX` di `lib/photo-config.ts`). Boleh ada satu tingkat
  folder brand di antaranya (`laptop/apple/PR-LAP-AP-MDHA4ID`) — pencocokan memakai segmen
  terdalam.
- **Format & urutan**: jpg/jpeg/png/webp/avif, nama berkas bebas. Berkas bernama angka
  (`1.jpg`, `2.png`, `10.webp`) diurutkan lebih dulu sesuai nilainya dan `1` jadi foto utama,
  sisanya urut abjad-natural (`asus.webp`, `asus2.webp`, `asus10.webp`). Maksimal **24 foto
  per produk**; berkas di atas batas dan berkas non-gambar (mis. `sampul.pdf`) **dilewati dan
  dilaporkan**, tidak membuat sinkron gagal.
- **Aset hasil "move" di Media Library tetap terbaca**: listing memakai Search API
  (`folder:"laptop*"`) dan membaca `asset_folder` + `display_name`, jadi aset yang `public_id`-nya
  tetap datar (mis. `copy_of_macbook_1`) tidak hilang. Yang disimpan ke database adalah
  `public_id` asli dari Cloudinary.
- **Pencocokan folder** tidak peka besar/kecil dan mengabaikan spasi berlebih; yang dibandingkan
  adalah segmen folder terdalam, jadi `laptop/PR-LAP-AC-A715` di Cloudinary cocok dengan
  `PR-LAP-AC-A715` di sheet.
- **Brand dikecualikan**: GIGABYTE, SPC, TECNO, ZYREX (`EXCLUDED_BRANDS` di
  `lib/photo-config.ts`). Pemetaannya tidak diimpor dan foldernya tidak dijadikan sumber foto.
- **Aman untuk kurasi admin**: sinkron **hanya** menulis `product_photos`. Kolom
  `products.image_urls` (foto yang diunggah manual di `/admin/products`) tidak pernah diubah;
  foto manual selalu tampil lebih dulu dan tidak ditimpa kecuali admin mencentang
  **timpa SKU yang sudah punya foto manual**.
- **Prasyarat**: migrasi `20261007000000_product_photos.sql` sudah jalan dan
  `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` terisi — Admin API hanya dipanggil dari
  server (`/api/admin/photos/*`, dijaga `requireAdmin()`), kredensial tidak pernah ke browser.

### Alur lewat halaman admin

1. Login → **Foto** (`/admin/photos`).
2. **Impor pemetaan**: unggah `.xlsx` (sheet `Pemetaan SKU`) atau `.csv` cadangan berheader
   `kodebarang,url_foto`, klik **periksa dulu**. Preview menampilkan jumlah baris terbaca,
   SKU yang cocok / tidak dikenal, folder duplikat, dan peringatan. Klik **simpan** untuk
   menulis ke `product_photo_folders`.
3. Bila perlu, ubah folder per SKU (kolom **ubah**) atau tambahkan SKU manual
   (**tambah sku manual**). Hapus baris untuk melepas pemetaan.
4. **Sinkron**: periksa prefix folder (default `laptop`) lalu klik **jalankan dry-run**.
   Wajib dibaca dulu — dry-run tidak menulis apa pun dan melaporkan:
   - **(a) akan disimpan** — hanya SKU ber-aksi `fill`/`update`: folder, jumlah foto,
     badge `−n lama` bila ada baris sinkron yang akan dibuang, dan pratinjau foto (layar
     memotong ke 100 baris, script ke 60 baris + angka lengkap di ringkasan). SKU yang sudah
     cocok (`sudah cocok`), terlindungi karena foto manual tanpa *timpa* (`dilindungi`), atau
     tidak punya foto (`tanpa foto`) tidak masuk daftar ini;
   - **(b) folder kosong** — folder pemetaan yang ada tapi isinya nol, atau yang belum dibuat
     sama sekali;
   - **foto basi** — SKU yang foldernya kini kosong padahal masih menyimpan baris hasil
     sinkron lama (barisnya **tidak** dihapus otomatis, perlu keputusan admin);
   - **(c) folder yatim** — folder di Cloudinary yang berisi foto tapi tidak ditunjuk SKU mana
     pun, beserta folder brand yang dikecualikan;
   - **(d) berkas dilewati** — berkas non-gambar + berkas yang melebihi batas 24 foto.
5. Klik **simpan hasil** (hanya aktif bila dry-run menemukan sesuatu yang perlu ditulis).
   Sistem mengganti baris `sumber='sync'` per SKU, memanggil `revalidateTag('products')`,
   lalu katalog langsung memakai foto baru.

Menjalankan dry-run dua kali berturut-turut menghasilkan **0 yang perlu disimpan** (idempoten).

### Alur lewat command line

```bash
# 1. impor pemetaan SKU → folder (dry-run default)
npx tsx scripts/import-photo-mapping.ts "C:/Users/<kamu>/Downloads/Daftar_Folder_Foto_Laptop.xlsx"
npx tsx scripts/import-photo-mapping.ts "…/Daftar_Folder_Foto_Laptop.xlsx" --apply

# 2. sinkron foto (dry-run default, tanpa --apply tidak ada yang ditulis)
npx tsx scripts/sync-photos.ts
npx tsx scripts/sync-photos.ts --apply
npx tsx scripts/sync-photos.ts --apply --overwrite   # termasuk SKU berfoto manual
npx tsx scripts/sync-photos.ts --prefix laptop       # kalau struktur folder berubah
```

Script memuat `.env.local` (atau `.env`) dari root proyek dan memakai paginasi
`next_cursor` Admin API, jadi ribuan aset tetap terbaca.

### Perilaku di sisi pengunjung

- Storefront mengambil semua baris `product_photos` dalam **satu query** lalu menggabungkannya
  dengan `image_urls` di JS (`lib/products.ts`, `mergeProductPhotos`). Kalau tabel belum ada
  (migrasi belum jalan), katalog tetap tampil — hanya ada satu peringatan di log server.
- Foto dirender dengan transformasi `f_auto,q_auto` (`lib/photo-url.ts`), `sizes` responsif per
  komponen, dan `loading="lazy"` kecuali foto utama. Varian warna otomatis memakai foto
  SKU-nya sendiri saat pembeli memilih warna.
- SKU yang tidak punya foto sama sekali menampilkan **placeholder** (SVG teks nama produk di
  atas latar #EDEDED), bukan gambar produk lain.

---

## 8. Menjalankan aplikasi

```bash
npm run dev      # http://localhost:3000
```

Untuk produksi:

```bash
npm run build
npm run start
```

Halaman penting:

| URL | Isi |
| --- | --- |
| `/` | Landing page: 8 produk unggulan (`is_featured`) + tombol ke katalog |
| `/shop` | Katalog utama + pencarian + pagination |
| `/katalog/gaming` `/katalog/ultrabook` `/katalog/produktivitas` | Katalog per kategori |
| `/product/<slug>` | Detail produk (slug diturunkan dari `KODEBARANG`). Varian warna digabung ke satu halaman dengan pemilih warna; slug anggota lama di-redirect (308) ke slug grup |
| `/lainnya/install-ulang-windows` | Jasa install ulang Windows (biaya dari database) |
| `/lainnya/install-software` `/lainnya/install-software/<slug>` | Jasa install software + detail |
| `/lainnya/sparepart` `/lainnya/sparepart/<slug>` | Sparepart + detail |
| `/cek-stok`, `/info/cod`, `/cara-pesan`, `/spesifikasi`, `/promo`, `/garansi` | Halaman info |
| `/admin/login` | Login admin (email + password Supabase Auth) |
| `/admin` | Ringkasan: jumlah produk, statistik, riwayat impor |
| `/admin/import` | Unggah Excel → preview diff → terapkan |
| `/admin/products` | Tabel produk: cari, filter (kategori layar, duplikat warna), sortir, ubah, aktif/nonaktif, hapus, "kategorikan ulang semua layar", "kelompokkan ulang semua produk" (deteksi warna + grup varian) |
| `/admin/install-ulang` | Ubah biaya & deskripsi jasa install ulang Windows |
| `/admin/software` | CRUD jasa install software (gambar via Cloudinary) |
| `/admin/sparepart` | CRUD sparepart (gambar via Cloudinary) |
| `/admin/photos` | Impor pemetaan SKU→folder (`Pemetaan SKU` / CSV), override folder per SKU, dry-run sinkron foto Cloudinary, simpan hasil |
| `/admin/addons` | Ubah harga add-on anti gores: default (fallback) + per ukuran layar 14"/15"/16" + status aktif |
| `/admin/orders` | Riwayat order intent: snapshot harga produk & add-on tiap klik tombol WhatsApp |

Semua route `/admin/*` dijaga `middleware.ts` (cek sesi cookie) **dan** dicek ulang di
server lewat `requireAdmin()`. Tanpa role admin, request diarahkan ke `/admin/login`.

---

## 9. Alur kerja bulanan memperbarui katalog

1. Terima file Excel baru dari distributor (mis. `PL_OKT.xlsx`).
2. Login ke `/admin/login`.
3. Buka **Impor Excel** (`/admin/import`).
4. Tarik file `.xlsx` ke area upload (maks. 10 MB), klik **Periksa & lihat diff**.
5. Baca ringkasan diff sebelum menyimpan:
   - **Baru** — kode yang belum ada di database.
   - **Berubah** — nilai lama → baru untuk spesifikasi / notes / SRP.
   - **Tidak ada di file** — produk lama yang hilang dari Excel. Pilih salah satu:
     - *Nonaktifkan* (default, soft delete — hilang dari toko tapi data & gambar tetap ada)
     - *Biarkan aktif*
     - *Hapus permanen* (gambar ikut hilang, tidak bisa dibatalkan)
   - **Error baris** — baris yang ditolak (kode kosong, duplikat, spesifikasi kosong, SRP tidak valid).
6. Klik **Terapkan Perubahan**. Sistem melakukan upsert per batch 500 baris, menulis
   `import_logs`, dan memanggil `revalidateTag('products')` supaya storefront langsung segar.
7. Kalau ada SKU baru / folder foto baru: unggah foldernya ke Cloudinary
   (`laptop/<Nama Folder>/1.jpg…`), perbarui sheet `Pemetaan SKU`, impor pemetaanannya,
   lalu jalankan **dry-run** sinkron foto sebelum menyimpan (bagian 7).
8. Cek `/admin/products` dan halaman toko untuk memastikan hasilnya.

**Penting:** impor Excel **tidak pernah** menyentuh kolom `image_urls`. Gambar yang sudah
diunggah lewat admin tetap utuh walaupun produknya diperbarui dari Excel. Kolom `M1` dan
`M1 vs LAMA` juga tidak pernah disimpan. Sinkron foto juga tidak menyentuh `image_urls` —
ia hanya menulis tabel `product_photos`.

**Idempoten:** mengimpor file yang sama dua kali menghasilkan **0 perubahan**.

---

## 10. Aturan harga SRP

- Nilai `SRP` di Excel dalam satuan **ribuan rupiah**. Contoh: `17999` = Rp 17.999.000.
- Database menyimpan angka mentah (`srp numeric`).
- Konversi terjadi di `lib/pricing.ts`:
  - `SRP_TO_RUPIAH = 1000` — ubah konstanta ini jika satuannya berubah.
  - `HARGA_BELUM_TERSEDIA = "Hubungi kami"` — teks yang tampil bila `SRP` 0/kosong.
  - `formatSrp(srp)` mengembalikan `"Hubungi kami"` bila `srp <= 0`, jadi **Rp 0 tidak pernah tampil**.
- Di admin, produk tanpa harga ditandai badge **harga belum tersedia**;
  di storefront tombolnya berubah menjadi **Tanya harga via WhatsApp**.

---

## 11. Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `/admin` redirect ke `/admin/login?error=not-configured` | Env Supabase belum diisi di `.env.local`. |
| Login sukses tapi muncul `forbidden` | `app_metadata.role` belum `admin`. Ulangi langkah 3. |
| `Sheet "LAPTOP" tidak ditemukan` | Nama sheet berbeda/tipografis salah. Error menampilkan daftar sheet yang ada. |
| Impor gagal `Kolom wajib tidak ditemukan: KODEBARANG` | Baris header bukan baris pertama, atau nama kolom berbeda. Parser mencari baris yang memuat `KODEBARANG`. |
| Semua harga tampil "Hubungi kami" | Kolom `SRP` kosong/0 di Excel. Isi SRP lalu impor ulang. |
| Upload gambar gagal | Cloudinary belum dikonfigurasi, atau preset unsigned salah nama, atau `CLOUDINARY_API_SECRET` belum diisi untuk mode signed. |
| Halaman `/admin/photos` banner merah "tabel belum ada" | Migrasi `20261007000000_product_photos.sql` belum dijalankan di Supabase. |
| Dry-run foto: semua folder "belum dibuat" / 0 aset | Foto belum diunggah ke bawah prefix `laptop`, atau `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` salah (Admin API menolak). Cek `report.warnings` di layar atau output script. |
| SKU tertentu tidak dapat foto padahal foldernya ada | Nama folder dibandingkan pada **segmen terdalam** (huruf kecil, spasi berlebih diabaikan), jadi sheet harus menunjuk folder yang sama dengan yang ada di Cloudinary. Cek juga brand dikecualikan (GIGABYTE/SPC/TECNO/ZYREX), status SKU `dilindungi` karena sudah punya `image_urls` manual (centang **timpa** bila memang mau diganti), dan ekstensi berkas — hanya jpg/jpeg/png/webp/avif yang dipakai. |
| Foto sinkron tidak muncul padahal sudah disimpan | Cache Next: simpan sudah memanggil `revalidateTag('products')`; tunggu maksimal 1 jam di produksi (`PRODUCTS_REVALIDATE_SECONDS = 3600`) atau restart dev server. |
| Perubahan admin tidak muncul di toko | Cache Next. Impor/edit sudah memanggil `revalidateTag`; tunggu maksimal 1 jam (`PRODUCTS_REVALIDATE_SECONDS = 3600`) atau restart server dev. |
| `npm run db:seed` gagal `.env.local tidak ditemukan` | Jalankan dari root proyek, atau ekspor env secara manual sebelum menjalankan script. |

---

## 12. Keamanan

- `SUPABASE_SERVICE_ROLE_KEY` dan `CLOUDINARY_API_SECRET` hanya dibaca proses server.
- Cloudinary **Admin API** (daftar aset & subfolder untuk sinkron foto) dipanggil dari
  `lib/cloudinary-admin.ts` lewat route `/api/admin/photos/*` yang dijaga `requireAdmin()`.
  Browser tidak pernah menerima API key/secret, dan hasil daftar aset hanya berupa
  `public_id` yang disimpan ke `product_photos`.
- RLS aktif di semua tabel: anon hanya bisa membaca `products` dengan `is_active = true`;
  tulis/hapus hanya untuk role admin. `import_logs` hanya bisa dibaca admin.
- `product_photos` bisa dibaca publik **hanya** untuk produk aktif; `product_photo_folders`
  (pemetaan SKU→folder) admin-only total, jadi struktur folder Cloudinary tidak bocor ke
  pengunjung.
- `Content-Security-Policy` di `next.config.js` membatasi `connect-src` ke origin Supabase
  dan Cloudinary, serta `img-src` ke `res.cloudinary.com`.
- Nomor WhatsApp penjual hanya ada di server (`WHATSAPP_NUMBER`), redirect dilakukan
  lewat `/api/wa` sehingga nomor tidak pernah muncul di HTML/JS client.
