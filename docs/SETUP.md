# Panduan Setup — KALOPSIA TECH

Dokumen ini menjelaskan cara menjalankan proyek dari nol: membuat database Supabase,
menjalankan migrasi SQL, membuat user admin pertama, menyiapkan Cloudinary, mengisi
data awal dari Excel, dan alur kerja bulanan memperbarui katalog.

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + RLS)
+ Cloudinary (gambar produk) + SheetJS `xlsx` (parsing Excel).

---

## 0. Prasyarat

- Node.js 18.17 atau lebih baru
- Akun [Supabase](https://supabase.com)
- Akun [Cloudinary](https://cloudinary.com) (opsional, tapi dibutuhkan untuk mengunggah gambar)
- File Excel katalog, contoh: `PL_26_SEPT.xlsx` (sheet `LAPTOP`)

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

---

## 7. Menjalankan aplikasi

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
| `/product/<slug>` | Detail produk (slug diturunkan dari `KODEBARANG`) |
| `/lainnya/install-ulang-windows` | Jasa install ulang Windows (biaya dari database) |
| `/lainnya/install-software` `/lainnya/install-software/<slug>` | Jasa install software + detail |
| `/lainnya/sparepart` `/lainnya/sparepart/<slug>` | Sparepart + detail |
| `/cek-stok`, `/info/cod`, `/cara-pesan`, `/spesifikasi`, `/promo`, `/garansi` | Halaman info |
| `/admin/login` | Login admin (email + password Supabase Auth) |
| `/admin` | Ringkasan: jumlah produk, statistik, riwayat impor |
| `/admin/import` | Unggah Excel → preview diff → terapkan |
| `/admin/products` | Tabel produk: cari, filter, sortir, ubah, aktif/nonaktif, hapus |
| `/admin/install-ulang` | Ubah biaya & deskripsi jasa install ulang Windows |
| `/admin/software` | CRUD jasa install software (gambar via Cloudinary) |
| `/admin/sparepart` | CRUD sparepart (gambar via Cloudinary) |
| `/admin/addons` | Ubah harga & status aktif 4 kombinasi add-on anti gores |

Semua route `/admin/*` dijaga `middleware.ts` (cek sesi cookie) **dan** dicek ulang di
server lewat `requireAdmin()`. Tanpa role admin, request diarahkan ke `/admin/login`.

---

## 8. Alur kerja bulanan memperbarui katalog

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
7. Cek `/admin/products` dan halaman toko untuk memastikan hasilnya.

**Penting:** impor Excel **tidak pernah** menyentuh kolom `image_urls`. Gambar yang sudah
diunggah lewat admin tetap utuh walaupun produknya diperbarui dari Excel. Kolom `M1` dan
`M1 vs LAMA` juga tidak pernah disimpan.

**Idempoten:** mengimpor file yang sama dua kali menghasilkan **0 perubahan**.

---

## 9. Aturan harga SRP

- Nilai `SRP` di Excel dalam satuan **ribuan rupiah**. Contoh: `17999` = Rp 17.999.000.
- Database menyimpan angka mentah (`srp numeric`).
- Konversi terjadi di `lib/pricing.ts`:
  - `SRP_TO_RUPIAH = 1000` — ubah konstanta ini jika satuannya berubah.
  - `HARGA_BELUM_TERSEDIA = "Hubungi kami"` — teks yang tampil bila `SRP` 0/kosong.
  - `formatSrp(srp)` mengembalikan `"Hubungi kami"` bila `srp <= 0`, jadi **Rp 0 tidak pernah tampil**.
- Di admin, produk tanpa harga ditandai badge **harga belum tersedia**;
  di storefront tombolnya berubah menjadi **Tanya harga via WhatsApp**.

---

## 10. Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `/admin` redirect ke `/admin/login?error=not-configured` | Env Supabase belum diisi di `.env.local`. |
| Login sukses tapi muncul `forbidden` | `app_metadata.role` belum `admin`. Ulangi langkah 3. |
| `Sheet "LAPTOP" tidak ditemukan` | Nama sheet berbeda/tipografis salah. Error menampilkan daftar sheet yang ada. |
| Impor gagal `Kolom wajib tidak ditemukan: KODEBARANG` | Baris header bukan baris pertama, atau nama kolom berbeda. Parser mencari baris yang memuat `KODEBARANG`. |
| Semua harga tampil "Hubungi kami" | Kolom `SRP` kosong/0 di Excel. Isi SRP lalu impor ulang. |
| Upload gambar gagal | Cloudinary belum dikonfigurasi, atau preset unsigned salah nama, atau `CLOUDINARY_API_SECRET` belum diisi untuk mode signed. |
| Perubahan admin tidak muncul di toko | Cache Next. Impor/edit sudah memanggil `revalidateTag`; tunggu maksimal 1 jam (`PRODUCTS_REVALIDATE_SECONDS = 3600`) atau restart server dev. |
| `npm run db:seed` gagal `.env.local tidak ditemukan` | Jalankan dari root proyek, atau ekspor env secara manual sebelum menjalankan script. |

---

## 11. Keamanan

- `SUPABASE_SERVICE_ROLE_KEY` dan `CLOUDINARY_API_SECRET` hanya dibaca proses server.
- RLS aktif di semua tabel: anon hanya bisa membaca `products` dengan `is_active = true`;
  tulis/hapus hanya untuk role admin. `import_logs` hanya bisa dibaca admin.
- `Content-Security-Policy` di `next.config.js` membatasi `connect-src` ke origin Supabase
  dan Cloudinary, serta `img-src` ke `res.cloudinary.com`.
- Nomor WhatsApp penjual hanya ada di server (`WHATSAPP_NUMBER`), redirect dilakukan
  lewat `/api/wa` sehingga nomor tidak pernah muncul di HTML/JS client.
