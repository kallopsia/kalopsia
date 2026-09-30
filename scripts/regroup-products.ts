/**
 * Deteksi ulang warna + pengelompokan varian untuk semua produk.
 *
 *   npx tsx scripts/regroup-products.ts            # dry-run (default)
 *   npx tsx scripts/regroup-products.ts --apply     # tulis ke database
 *
 * Dry-run mencetak ringkasan tanpa menyimpan apa pun. Override warna manual
 * (warna_source='manual') tidak pernah ditimpa. Produk dengan kunci grup +
 * warna kanonik yang sama ditandai duplikat (tidak digabung) untuk direview.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

async function main() {
  loadEnv();

  const apply = process.argv.slice(2).includes("--apply");

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

  // Peta id → kode_barang untuk laporan yang mudah dibaca.
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id,kode_barang");
  if (productError) {
    console.error(
      `Gagal membaca produk: ${productError.message}\n` +
        `Pastikan migrasi 20261006000000_product_variants.sql sudah dijalankan.`
    );
    process.exit(1);
  }
  const kodeById = new Map<string, string>(
    ((productData || []) as { id: string; kode_barang: string }[]).map((row) => [
      row.id,
      row.kode_barang,
    ])
  );

  const { regroupProducts } = await import("../lib/product-color");

  console.log(`\n${apply ? "MENERAPKAN" : "DRY-RUN"} — deteksi warna & grup varian:\n`);
  const report = await regroupProducts(!apply);

  const dupChanges = report.changes.filter((c) => c.duplikat_warna === true);
  const groupChanges = report.changes.filter((c) => c.group_slug);

  if (groupChanges.length > 0) {
    console.log("  Anggota grup (→ slug perwakilan):");
    groupChanges.slice(0, 60).forEach((c) => {
      console.log(`    ${(kodeById.get(c.id) || c.id).padEnd(24)} → ${c.group_slug}`);
    });
    if (groupChanges.length > 60) {
      console.log(`    … dan ${groupChanges.length - 60} lainnya.`);
    }
    console.log("");
  }

  if (dupChanges.length > 0) {
    console.log("  Duplikat (kunci grup + warna sama, perlu review admin):");
    dupChanges.slice(0, 40).forEach((c) => {
      console.log(`    - ${kodeById.get(c.id) || c.id}`);
    });
    if (dupChanges.length > 40) {
      console.log(`    … dan ${dupChanges.length - 40} lainnya.`);
    }
    console.log("");
  }

  console.log("• Ringkasan:");
  console.log(`    produk diproses        ${report.processed}`);
  console.log(`    grup varian terbentuk  ${report.groups}`);
  console.log(`    produk tergabung grup  ${report.grouped}`);
  console.log(`    warna tunggal          ${report.singleColor}`);
  console.log(`    duplikat ditandai      ${report.duplicates}`);
  console.log(`    baris berubah          ${report.changed}`);

  if (!apply) {
    console.log("\nDry-run selesai. Tidak ada yang disimpan. Tambahkan --apply untuk menulis.");
    return;
  }
  console.log(`\n• Selesai. ${report.changed} baris produk diperbarui.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
