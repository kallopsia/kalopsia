# KALOPSIA TECH — Minimalist Laptop E-Commerce

Website e-commerce laptop dengan Next.js 14 (App Router), TypeScript, dan Tailwind CSS.
Data produk disimpan di **Supabase** (Postgres + Auth + RLS) dan dikelola lewat
**halaman admin** (`/admin`) dengan upload file Excel (.xlsx). Checkout dilakukan
langsung via **WhatsApp** tanpa payment gateway.

Panduan lengkap (setup Supabase, migrasi SQL, user admin pertama, Cloudinary, seed,
alur kerja bulanan) ada di **[docs/SETUP.md](docs/SETUP.md)**.

---

## Menjalankan secara lokal

1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Salin dan isi environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Isi minimal `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan
   `SUPABASE_SERVICE_ROLE_KEY` (lihat `.env.example` untuk variabel Cloudinary dan
   `WHATSAPP_NUMBER`).
3. Jalankan migrasi SQL di Supabase (isi `supabase/migrations/*.sql` lewat SQL Editor
   atau `supabase db push`).
4. Isi data awal dari Excel:
   ```bash
   npm run db:seed
   ```
5. Development server:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

Build produksi:

```bash
npm run build
npm run start
```

> Jika database kosong atau tidak terbaca, storefront menampilkan pesan
> "KATALOG KOSONG" — tidak ada produk contoh yang ditampilkan, supaya kondisi
> database selalu terlihat apa adanya.

---

## Struktur folder utama

```text
├── app/
│   ├── admin/                  # Area admin: login, ringkasan, produk, layanan, sparepart, foto, impor Excel
│   ├── api/
│   │   ├── admin/              # API admin (produk, software, sparepart, layanan, impor, foto) — service role hanya di server
│   │   ├── auth/               # Login/logout Supabase Auth (@supabase/ssr)
│   │   ├── cloudinary/sign/    # Tanda tangan signed upload (API secret tidak pernah ke client)
│   │   └── wa/                 # Pembuat link WhatsApp (nomor penjual tersembunyi di server)
│   ├── katalog/[kategori]/     # Katalog per kategori (gaming / ultrabook / produktivitas)
│   ├── lainnya/                # Jasa: install-ulang-windows, install-software, sparepart
│   ├── info/cod/               # Info layanan COD + FAQ
│   ├── product/[slug]/         # Detail produk
│   ├── shop/                   # Katalog lengkap: search, filter brand, tab, pagination
│   ├── contact/, terms/        # Halaman tujuan link footer
│   ├── cek-stok, spesifikasi, cara-pesan, garansi, promo
│   ├── page.tsx                # Landing page: 8 produk is_featured, pola grid 3-1-3-1
│   └── layout.tsx              # Root layout, JetBrains Mono, Header & Footer
├── components/
│   ├── admin/                  # Komponen area admin (form produk/software/sparepart, impor, gambar, pemetaan & sinkron foto, toast)
│   ├── Header.tsx              # Desktop: bar hitam -> hover expand; mobile: hamburger + panel
│   ├── Footer.tsx              # contact / terms / copyright saja
│   ├── LandingShowcase.tsx     # Grid landing foto-saja (trio + kartu lebar 21:9)
│   ├── ExploreAllButton.tsx    # Tombol landing -> /shop (client-side + scroll smooth)
│   ├── RouteFade.tsx           # Fade 300ms setiap ganti route
│   ├── ServiceCatalog.tsx      # Grid kartu jasa/sparepart (pola sama dengan grid laptop)
│   ├── FaqAccordion.tsx        # Akordeon FAQ (satu terbuka pada satu waktu)
│   └── ProductCatalog.tsx, ProductGallery.tsx, dll.
├── lib/
│   ├── supabase/               # Klien read (anon, cache tag) & service role (server-only)
│   ├── xlsx-parser.ts          # Parser sheet LAPTOP (dipakai seed & impor admin)
│   ├── import.ts               # Diff + upsert batch + log impor
│   ├── products.ts             # Query katalog + status koneksi database
│   ├── services.ts             # Query publik jasa & sparepart
│   ├── admin-products.ts, admin-services.ts  # CRUD sisi server (service role)
│   ├── product-view.ts         # Slug/brand/kategori/ringkasan spek (diturunkan saat baca)
│   ├── kode-barang.ts          # Regex strip prefix lama PR-LAP-<BRAND>- (parser, script, slug)
│   ├── addons.ts, admin-addons.ts, addon-labels.ts  # Add-on anti gores (baca, simpan, label)
│   ├── screen-category.ts      # Deteksi kategori layar 14/15/16 dari teks spesifikasi (murni)
│   ├── product-screen.ts       # Akses server-only product_screen_info (admin-only RLS)
│   ├── color-config.ts         # Daftar 42 kode warna + peta alias kanonik (satu-satunya sumber)
│   ├── color-category.ts       # Deteksi warna (longest-match, word-boundary) + kunci grup varian (murni)
│   ├── product-color.ts        # Server-only: deteksi warna, override manual, regroup varian
│   ├── photo-config.ts         # Prefix Cloudinary `laptop`, brand dikecualikan, parse kode brand
│   ├── photo-file.ts           # Urutan foto per folder (angka dulu, lalu abjad-natural), batas 24/produk
│   ├── photo-mapping.ts        # Normalisasi + penggabungan sheet "Pemetaan SKU" ke produk
│   ├── photo-mapping-parser.ts # Baca xlsx/CSV pemetaan (kolom KODEBARANG + folder/URL foto)
│   ├── photo-sync.ts           # Engine sinkron: plan dry-run, folder kosong, yatim, foto basi
│   ├── cloudinary-admin.ts     # Admin API List-Resources via fetch (kredensial hanya di server)
│   ├── photo-url.ts            # URL f_auto,q_auto dari public_id + merge foto manual/sync
│   ├── admin-photos.ts, admin-photo-mapping.ts # CRUD server-side tabel foto & pemetaan
│   ├── order-intents.ts        # Snapshot harga saat klik WA (tabel order_intents, admin-only)
│   ├── slug.ts, service-schema.ts, product-schema.ts  # Validasi zod + slug URL
│   └── pricing.ts              # SRP (ribuan rupiah) → Rupiah, harga jasa (rupiah penuh)
├── scripts/seed-from-xlsx.ts   # npm run db:seed
├── scripts/strip-kode-prefix.ts # Migrasi sekali-jalan: buang prefix PR-LAP-<BRAND>-
├── scripts/backfill-screen-category.ts # Backfill kategori layar (dry-run default, --apply)
├── scripts/regroup-products.ts # Deteksi warna + kelompokkan varian (dry-run default, --apply)
├── scripts/import-photo-mapping.ts # Impor sheet Pemetaan SKU (dry-run default, --apply)
├── scripts/sync-photos.ts      # Sinkron foto Cloudinary (dry-run default, --apply/--overwrite)
├── supabase/migrations/        # Skema products, import_logs, software_services, spareparts, services_windows_install, product_addons, product_screen_info, order_intents, product_photo_folders + product_photos, kolom varian (stok/warna/grup) + RLS
└── docs/SETUP.md               # Panduan setup & alur kerja bulanan
```

---

## Catatan penting

- **Sumber data tunggal**: tabel `products` di Supabase. Kolom Excel `M1` dan
  `M1 vs LAMA` diabaikan total; `image_urls` tidak pernah diubah oleh impor Excel
  (gambar hanya dikelola dari admin/Cloudinary).
- **Harga**: kolom `SRP` dalam satuan ribuan rupiah; konversi di `lib/pricing.ts`
  (`SRP_TO_RUPIAH = 1000`). SRP 0 ditampilkan sebagai "Hubungi kami", bukan Rp 0.
- **Keamanan**: `SUPABASE_SERVICE_ROLE_KEY` dan `CLOUDINARY_API_SECRET` hanya dibaca
  proses server. RLS membatasi anon ke `is_active = true`; tulis/hapus hanya role admin.
  Nomor WhatsApp hanya ada di server via `/api/wa`.
- **Gambar Cloudinary**: unggah lewat form admin (unsigned preset atau signed upload)
  atau tempel URL `https://res.cloudinary.com/<CLOUD_NAME>/...`; gambar pertama = utama.
- **Sinkron foto Cloudinary** (`/admin/photos`): sumber kebenaran pemetaan adalah sheet
  **`Pemetaan SKU`** di Excel foto (kolom `KODEBARANG` + nama folder) — sistem **tidak pernah**
  menebak folder dari kode barang atau nama produk. Satu folder bisa melayani banyak SKU, dan
  satu SKU bisa di-override manual ke folder lain. Foto berada di `laptop/<Nama Folder>/…`
  (boleh bersarang satu tingkat, mis. `laptop/apple/PR-LAP-AP-MDHA4ID`); format
  jpg/jpeg/png/webp/avif dengan nama berkas bebas — berkas bernama angka diurutkan lebih dulu
  sesuai nilainya (`1` = foto utama), sisanya urut abjad-natural, maksimal 24 foto per produk;
  berkas non-gambar dilewati dan dilaporkan. Aset yang dipindah lewat Media Library tetap
  terbaca (listing memakai Search API + `asset_folder`). Brand
  **GIGABYTE, SPC, TECNO, ZYREX** dikecualikan (`lib/photo-config.ts`). Hasil sinkron disimpan
  sebagai `public_id` di tabel `product_photos` dan dirender dengan transformasi
  `f_auto,q_auto`; **impor dan sinkron tidak pernah menyentuh `products.image_urls`** — foto
  kurasi admin selalu tampil lebih dulu dan tidak ditimpa kecuali admin mencentang *timpa*.
  Alur: impor pemetaan → **dry-run wajib** (melaporkan SKU terisi + jumlah foto, folder kosong /
  belum dibuat, folder yatim, berkas dilewati) → simpan. Command line:
  `npx tsx scripts/import-photo-mapping.ts "<file.xlsx>" [--apply]` dan
  `npx tsx scripts/sync-photos.ts [--apply] [--overwrite] [--prefix <p>]`. Admin API Cloudinary
  hanya dipanggil dari server (`/api/admin/photos/*` dijaga `requireAdmin()`); tanpa
  `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` tombol sinkron tidak bisa dipakai.
- **Landing page**: `/` menampilkan maksimal 8 produk ber-`is_featured = true` (kartu
  foto saja, pola 3-1-3-1) plus tombol "EXPLORE ALL PRODUCTS" ke `/shop`. Produk unggulan
  dipilih dari admin (checkbox "Tampilkan di landing page"); selama belum ada yang
  dicentang, 8 produk aktif pertama yang dipakai. Katalog lengkap ada di `/shop`.
- **Layanan & sparepart**: tabel `services_windows_install` (satu baris biaya jasa install
  ulang Windows), `software_services`, dan `spareparts` — semuanya diisi dari admin
  (`/admin/install-ulang`, `/admin/software`, `/admin/sparepart`). Harga pada tabel-tabel
  ini **rupiah penuh** (150000 = Rp 150.000), berbeda dengan `products.srp` yang dalam
  satuan ribu. Halaman publiknya: `/lainnya/install-ulang-windows`,
  `/lainnya/install-software[/<slug>]`, `/lainnya/sparepart[/<slug>]`.
- **Tombol WhatsApp**: semua tombol ("Pesan Sekarang", "Chat Admin", "Beli via WhatsApp")
  menunjuk ke `/api/wa` dengan parameter (`slug`, `software`, `sparepart`, atau `pesan=<kunci>`).
  Nomor dan isi pesan dirakit di server; kunci `pesan` dibatasi whitelist.
- **Kode barang**: prefix lama `PR-LAP-<KODE BRAND>-` tidak lagi disimpan. Parser Excel
  membuang prefix saat membaca (`lib/kode-barang.ts`), dan data lama dibersihkan sekali
  lewat `npx tsx scripts/strip-kode-prefix.ts` (kode yang bakal bentrok dilewati & dilaporkan).
  Slug URL diturunkan dari kode tanpa prefix.
- **Nama produk**: kolom `nama_produk` opsional diisi dari admin (`/admin/products` → Ubah).
  Selama kosong, judul kartu & halaman detail fallback ke teks spesifikasi (perilaku lama).
- **Add-on anti gores**: tabel `product_addons` (body/layar × matte/glossy, harga rupiah penuh)
  diatur di `/admin/addons`. Setiap add-on punya harga **default (fallback)** plus harga per
  ukuran layar **14"/15"/16"**; halaman produk otomatis memakai harga sesuai kategori layar
  produk (konsumen hanya melihat angka, bukan label ukurannya). Bila produk belum terkategori
  atau harga ukurannya 0, jatuh ke harga default. Di halaman produk add-on muncul sebagai
  accordion opsional; pilihan pembeli (maksimal satu per kategori) ikut masuk pesan WhatsApp
  beserta estimasi totalnya.
- **Order intent**: setiap klik tombol WhatsApp (`/api/wa`) dicatat ke tabel `order_intents`
  (service role, RLS admin-only) berisi snapshot harga produk + add-on pada saat transaksi.
  Lihat riwayat di `/admin/orders`. Ini jejak minat beli, bukan pembayaran.
- **Kategori layar (admin-only)**: ukuran 14"/15"/16" disimpan di tabel `product_screen_info`
  yang RLS-nya admin-only total, jadi **tidak pernah** bocor ke pengunjung maupun API publik
  Supabase. Kategori dideteksi otomatis dari teks spesifikasi (`lib/screen-category.ts`,
  ada unit test di `tests/`) saat produk dibuat/diubah/diimpor; admin bisa override manual
  atau "reset ke otomatis" di halaman ubah produk, memfilter daftar produk per ukuran, dan
  mengkategorikan ulang semua produk sekaligus. Produk yang tak terdeteksi ditandai "belum
  terkategori". Backfill massal: `npx tsx scripts/backfill-screen-category.ts` (dry-run;
  tambah `--apply` untuk menyimpan). Kategori ini dipakai mencocokkan harga add-on per ukuran.
- **Varian warna**: produk dengan nama + spesifikasi (tanpa kode warna) + kategori layar yang
  sama digabung ke **satu halaman** dengan pemilih warna; tiap varian tetap punya harga, stok,
  kode barang, dan fotonya sendiri. Warna dideteksi otomatis dari spesifikasi (`lib/color-config.ts`
  = satu-satunya daftar 42 kode + alias; `lib/color-category.ts` = longest-match-first, word-boundary,
  tanpa match di dalam kata mis. SAND pada SANDISK). URL varian lama di-redirect (308) ke URL grup;
  shop/landing hanya menampilkan satu kartu per grup. Varian habis tetap terlihat sebagai
  "tidak tersedia" (tidak disembunyikan); produk tanpa kode warna = warna tunggal, tanpa pemilih.
  Deteksi jalan saat create/update/impor + tombol "kelompokkan ulang semua produk" di admin; admin
  bisa override warna manual atau "reset ke otomatis". Kunci grup + warna sama persis → ditandai
  **duplikat** (tidak digabung, perlu review; filter "duplikat warna" di daftar produk). Kolom
  `stok` (NULL = tidak dilacak/dianggap tersedia, 0 = habis). Grup dihitung ulang massal:
  `npx tsx scripts/regroup-products.ts` (dry-run; tambah `--apply` untuk menyimpan).
- **Test**: `npm test` menjalankan vitest (`tests/*.test.ts`), mencakup deteksi kategori layar,
  deteksi warna (longest-match, word-boundary, alias, kunci grup varian), nama/sort berkas foto,
  pemetaan SKU→folder, URL/merge foto, Admin API Cloudinary (fetch di-stub), dan engine sinkron.
- **Deploy (Vercel dll.)**: tambahkan semua variabel di `.env.example` ke dashboard
  hosting, lalu deploy seperti proyek Next.js biasa. Jalankan migrasi di
  `supabase/migrations/` sebelum/sesudah deploy (menambah kolom/tabel aman bagi kode lama).
