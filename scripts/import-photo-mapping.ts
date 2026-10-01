/**
 * Impor pemetaan SKU → folder foto Cloudinary dari berkas.
 *
 *   npx tsx scripts/import-photo-mapping.ts "C:/path/Daftar_Folder_Foto_Laptop.xlsx"           # dry-run (default)
 *   npx tsx scripts/import-photo-mapping.ts "C:/path/Daftar_Folder_Foto_Laptop.xlsx" --apply    # tulis ke database
 *
 * Sumber kebenaran: sheet "Pemetaan SKU" (kolom A KODEBARANG, kolom B Nama Folder).
 * Fallback: CSV dengan header "kodebarang,url_foto".
 * Pemetaan tidak pernah ditebak dari kode barang atau nama produk.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { countByFolder, joinMappingToProducts, normalizeMappingRows } from "../lib/photo-mapping";
import { parsePhotoMappingFile } from "../lib/photo-mapping-parser";

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
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const filePath = args.find((arg) => !arg.startsWith("--"));

  if (!filePath) {
    console.error(
      'Pemakaian: npx tsx scripts/import-photo-mapping.ts "<berkas.xlsx|berkas.csv>" [--apply]'
    );
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`Berkas tidak ditemukan: ${filePath}`);
    process.exit(1);
  }

  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "\nNEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.\n" +
        "Isi dulu (lihat docs/SETUP.md), lalu jalankan ulang."
    );
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  const parsed = parsePhotoMappingFile(
    new Uint8Array(buffer),
    filePath.split(/[\\/]/).pop() || "pemetaan"
  );

  console.log(`• Sheet terbaca: "${parsed.sheetName}" — ${parsed.inputs.length} baris.`);
  parsed.warnings.forEach((warning) => console.log(`  ! ${warning}`));

  const normalized = normalizeMappingRows(parsed.inputs);
  normalized.issues.forEach((issue) =>
    console.log(`  ! baris ${issue.rowNumber ?? "-"}: ${issue.message}`)
  );
  if (normalized.excludedCount > 0) {
    console.log(`  • Dilewati (brand tidak dijual): ${normalized.excludedCount} baris`);
  }
  if (normalized.duplicateCount > 0) {
    console.log(`  • SKU duplikat dalam berkas (baris terakhir menang): ${normalized.duplicateCount}`);
  }

  const { getSupabaseServiceClient } = await import("../lib/supabase/service");
  const supabase = getSupabaseServiceClient();
  const { data: productData, error } = await supabase.from("products").select("id,kode_barang");
  if (error) {
    console.error(`Gagal membaca produk: ${error.message}`);
    process.exit(1);
  }
  const products = (productData || []) as { id: string; kode_barang: string }[];

  const joined = joinMappingToProducts(normalized.rows, products);
  console.log(`\n• SKU valid: ${normalized.rows.length}  |  folder unik: ${joined.folderKeys.length}`);
  console.log(`• Sudah ada produknya di DB: ${joined.targets.length}  |  SKU belum ada di DB: ${joined.unknownSkus.length}`);

  const reuse = countByFolder(joined.targets).slice(0, 10);
  if (reuse.length > 0) {
    console.log("\n• Folder terpakai banyak SKU (10 teratas):");
    reuse.forEach((item) => console.log(`    ${item.folderKey} → ${item.count} SKU`));
  }

  if (joined.unknownSkus.length > 0) {
    console.log(`\n• SKU di pemetaan tapi belum ada di katalog (tetap disimpan, maks 40 ditampilkan):`);
    joined.unknownSkus.slice(0, 40).forEach((row) => console.log(`    - ${row.kode_barang} → ${row.folder}`));
  }

  if (!apply) {
    console.log("\nDry-run selesai. Tidak ada yang disimpan. Tambahkan --apply untuk menulis.");
    return;
  }

  const { savePhotoMapping } = await import("../lib/admin-photo-mapping");
  const source = (filePath.toLowerCase().endsWith(".csv") ? "csv" : "xlsx") as "csv" | "xlsx";
  const saved = await savePhotoMapping(normalized.rows, source);
  console.log(`\n• Selesai. ${saved} baris pemetaan ditulis ke product_photo_folders.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
