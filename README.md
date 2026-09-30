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
│   ├── admin/                  # Area admin: login, ringkasan, produk, layanan, sparepart, impor Excel
│   ├── api/
│   │   ├── admin/              # API admin (produk, software, sparepart, layanan, impor) — service role hanya di server
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
│   ├── admin/                  # Komponen area admin (form produk/software/sparepart, impor, gambar, toast)
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
│   ├── slug.ts, service-schema.ts, product-schema.ts  # Validasi zod + slug URL
│   └── pricing.ts              # SRP (ribuan rupiah) → Rupiah, harga jasa (rupiah penuh)
├── scripts/seed-from-xlsx.ts   # npm run db:seed
├── scripts/strip-kode-prefix.ts # Migrasi sekali-jalan: buang prefix PR-LAP-<BRAND>-
├── supabase/migrations/        # Skema products, import_logs, software_services, spareparts, services_windows_install, product_addons + RLS
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
  diatur di `/admin/addons`. Di halaman produk muncul sebagai accordion opsional; pilihan
  pembeli (maksimal satu per kategori) ikut masuk pesan WhatsApp beserta estimasi totalnya.
- **Deploy (Vercel dll.)**: tambahkan semua variabel di `.env.example` ke dashboard
  hosting, lalu deploy seperti proyek Next.js biasa. Jalankan migrasi di
  `supabase/migrations/` sebelum/sesudah deploy (menambah kolom/tabel aman bagi kode lama).
