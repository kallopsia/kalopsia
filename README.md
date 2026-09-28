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
│   ├── admin/                  # Area admin: login, ringkasan, produk, impor Excel, gambar massal
│   ├── api/
│   │   ├── admin/              # API admin (produk, impor, gambar) — service role hanya di server
│   │   ├── auth/               # Login/logout Supabase Auth (@supabase/ssr)
│   │   ├── cloudinary/sign/    # Tanda tangan signed upload (API secret tidak pernah ke client)
│   │   └── wa/                 # Pembuat link WhatsApp (nomor penjual tersembunyi di server)
│   ├── katalog/[kategori]/     # Katalog per kategori (gaming / ultrabook / produktivitas)
│   ├── product/[slug]/         # Detail produk
│   ├── cek-stok, spesifikasi, cara-pesan, garansi, promo
│   └── layout.tsx              # Root layout, JetBrains Mono, Header & Footer
├── components/
│   ├── admin/                  # Komponen area admin (form, impor, gambar, toast)
│   ├── Header.tsx, Footer.tsx, ProductCatalog.tsx, ProductGallery.tsx, dll.
├── lib/
│   ├── supabase/               # Klien read (anon, cache tag) & service role (server-only)
│   ├── xlsx-parser.ts          # Parser sheet LAPTOP (dipakai seed & impor admin)
│   ├── import.ts               # Diff + upsert batch + log impor
│   ├── products.ts             # Query katalog + status koneksi database
│   ├── product-view.ts         # Slug/brand/kategori/ringkasan spek (diturunkan saat baca)
│   └── pricing.ts              # SRP (ribuan rupiah) → Rupiah, teks "harga belum tersedia"
├── scripts/seed-from-xlsx.ts   # npm run db:seed
├── supabase/migrations/        # Skema products + import_logs, RLS, index, trigger
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
- **Deploy (Vercel dll.)**: tambahkan semua variabel di `.env.example` ke dashboard
  hosting, lalu deploy seperti proyek Next.js biasa.
