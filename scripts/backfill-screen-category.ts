/**
 * Backfill kategori layar untuk semua produk.
 *
 *   npx tsx scripts/backfill-screen-category.ts            # dry-run (default)
 *   npx tsx scripts/backfill-screen-category.ts --apply     # tulis ke database
 *   npx tsx scripts/backfill-screen-category.ts --apply --only-uncategorized
 *
 * Dry-run mencetak hasil deteksi per produk tanpa menyimpan apa pun.
 * Override manual (sumber='manual') tidak pernah ditimpa.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { detectScreenCategory, SCREEN_CATEGORY_LABELS } from "../lib/screen-category";
import type { ScreenCategory } from "../lib/screen-category";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UPSERT_BATCH = 200;

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = join(projectRoot, file);
    if (!existsSync(path)) continue;
    try {
      process.loadEnvFile(path);
      console.log(`• Env dimuat dari ${file}`);
      return;
    } catch {
      // Node < 20.12 tanpa loadEnvFile; pakai env proses.
    }
  }
}

type Product = { id: string; kode_barang: string; spesifikasi: string };
type ScreenRow = { product_id: string; kategori: ScreenCategory; sumber: string };

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const onlyUncategorized = args.includes("--only-uncategorized");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "\nNEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.\n" +
        "Isi dulu (lihat docs/SETUP.md), lalu jalankan ulang."
    );
    process.exit(1);
  }

  const { getSupabaseServiceClient } = await import("../lib/supabase/service");
  const supabase = getSupabaseServiceClient();

  const { data: productData, error } = await supabase
    .from("products")
    .select("id,kode_barang,spesifikasi");
  if (error) {
    console.error(`Gagal membaca produk: ${error.message}`);
    process.exit(1);
  }
  const products = (productData || []) as Product[];
  console.log(`• Terbaca ${products.length} produk.`);

  const { data: screenData, error: screenError } = await supabase
    .from("product_screen_info")
    .select("product_id,kategori,sumber");
  if (screenError) {
    console.error(
      `Gagal membaca product_screen_info: ${screenError.message}\n` +
        `Pastikan migrasi 20261004000000_product_screen_info.sql sudah dijalankan.`
    );
    process.exit(1);
  }
  const existing = new Map<string, ScreenRow>(
    (screenData || []).map((row: ScreenRow) => [row.product_id, row as ScreenRow])
  );

  const toWrite: { product_id: string; kategori: ScreenCategory; sumber: "auto" }[] = [];
  const counts: Record<string, number> = { "14": 0, "15": 0, "16": 0, belum: 0 };
  let skippedManual = 0;
  let unchanged = 0;
  const undetected: Product[] = [];

  console.log(`\n${apply ? "MENERAPKAN" : "DRY-RUN"} — perubahan kategori layar:\n`);
  console.log(
    "  kode_barang".padEnd(24) +
      "sebelum".padEnd(14) +
      "→".padEnd(4) +
      "sesudah".padEnd(14) +
      "sumber"
  );

  for (const product of products) {
    const detected = detectScreenCategory(product.spesifikasi);
    counts[detected] += 1;
    if (detected === "belum") undetected.push(product);

    const current = existing.get(product.id);
    if (current?.sumber === "manual") {
      skippedManual += 1;
      continue;
    }
    if (onlyUncategorized && current && current.kategori !== "belum") {
      unchanged += 1;
      continue;
    }
    if (current && current.kategori === detected && current.sumber === "auto") {
      unchanged += 1;
      continue;
    }

    const before = current
      ? `${SCREEN_CATEGORY_LABELS[current.kategori as ScreenCategory]} (${current.sumber})`
      : "(belum ada)";
    console.log(
      `  ${product.kode_barang}`.padEnd(24) +
        before.padEnd(14) +
        "→".padEnd(4) +
        SCREEN_CATEGORY_LABELS[detected].padEnd(14) +
        "auto"
    );
    toWrite.push({ product_id: product.id, kategori: detected, sumber: "auto" });
  }

  console.log("\n• Ringkasan deteksi seluruh katalog:");
  (Object.keys(counts) as ScreenCategory[]).forEach((key) => {
    console.log(`    ${SCREEN_CATEGORY_LABELS[key].padEnd(20)} ${counts[key]}`);
  });
  console.log(`\n• Akan ditulis: ${toWrite.length}  |  tidak berubah: ${unchanged}  |  manual dilewati: ${skippedManual}`);

  if (undetected.length > 0) {
    console.log(
      `\n• ${undetected.length} produk belum terdeteksi otomatis (perlu cek manual). Contoh (maks 25):`
    );
    undetected.slice(0, 25).forEach((p) => console.log(`    - ${p.kode_barang}: ${p.spesifikasi}`));
  }

  if (!apply) {
    console.log("\nDry-run selesai. Tidak ada yang disimpan. Tambahkan --apply untuk menulis.");
    return;
  }

  if (toWrite.length === 0) {
    console.log("\nTidak ada yang perlu ditulis.");
    return;
  }

  let written = 0;
  for (let i = 0; i < toWrite.length; i += UPSERT_BATCH) {
    const batch = toWrite.slice(i, i + UPSERT_BATCH);
    const { error: upsertError } = await supabase
      .from("product_screen_info")
      .upsert(batch, { onConflict: "product_id" });
    if (upsertError) {
      console.error(`Gagal menulis batch ${i}: ${upsertError.message}`);
      process.exit(1);
    }
    written += batch.length;
  }
  console.log(`\n• Selesai. ${written} baris kategori layar ditulis.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
