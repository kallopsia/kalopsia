/**
 * Seed katalog produk dari file Excel (sheet LAPTOP) ke Supabase.
 *
 *   npx tsx scripts/seed-from-xlsx.ts [path/ke/file.xlsx] [--snapshot-only] [--missing=deactivate|keep|delete]
 *   npm run db:seed
 *
 * Logika parsing & upsert memakai modul yang sama dengan impor admin
 * (lib/xlsx-parser.ts + lib/import.ts) sehingga hasilnya identik.
 * Kolom M1 tidak pernah dibaca, dan image_urls tidak pernah disentuh.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLaptopWorkbook, XlsxParseError } from "../lib/xlsx-parser";
import { applyImport, computeImportDiff, type MissingAction } from "../lib/import";
import type { ProductRow } from "../types/product";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FILE = join(projectRoot, "PL_26_SEPT.xlsx");
const SNAPSHOT_PATH = join(projectRoot, "data", "products.json");

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = join(projectRoot, file);
    if (!existsSync(path)) continue;
    try {
      process.loadEnvFile(path);
      console.log(`• Env dimuat dari ${file}`);
      return;
    } catch {
      // Node < 20.12 tidak punya loadEnvFile; lanjutkan dengan env proses.
    }
  }
}

function stableId(kodeBarang: string): string {
  const hash = createHash("md5").update(kodeBarang).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(
    17,
    20
  )}-${hash.slice(20, 32)}`;
}

function writeSnapshot(rows: ProductRow[]): void {
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`• Snapshot fallback ditulis: data/products.json (${rows.length} produk)`);
}

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((arg) => arg.startsWith("--"));
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const snapshotOnly = flags.includes("--snapshot-only");
  const missingFlag = flags.find((flag) => flag.startsWith("--missing="));
  const missingAction: MissingAction = (missingFlag?.split("=")[1] as MissingAction) || "deactivate";

  const filePath = positional[0] ? resolve(process.cwd(), positional[0]) : DEFAULT_FILE;
  if (!existsSync(filePath)) {
    console.error(
      `File Excel tidak ditemukan: ${filePath}\n` +
        `Letakkan file sebagai PL_26_SEPT.xlsx di root proyek atau sebutkan path-nya sebagai argumen.`
    );
    process.exit(1);
  }

  loadEnv();
  console.log(`• Membaca ${filePath}`);

  let parsed;
  try {
    parsed = parseLaptopWorkbook(new Uint8Array(readFileSync(filePath)));
  } catch (error) {
    console.error(
      error instanceof XlsxParseError ? `Gagal: ${error.message}` : `Gagal: ${String(error)}`
    );
    process.exit(1);
  }

  console.log(
    `• Sheet "${parsed.sheetName}": ${parsed.dataRowCount} baris data, ${parsed.rows.length} valid, ${parsed.errors.length} error`
  );
  parsed.warnings.forEach((warning) => console.log(`  ! ${warning}`));
  parsed.errors.slice(0, 20).forEach((error) =>
    console.log(`  ✗ baris ${error.rowNumber ?? "-"}: ${error.message}`)
  );

  const now = new Date().toISOString();
  const snapshot: ProductRow[] = parsed.rows.map((row) => ({
    id: stableId(row.kode_barang),
    kode_barang: row.kode_barang,
    spesifikasi: row.spesifikasi,
    notes: row.notes,
    srp: row.srp,
    m1_vs_lama: row.m1_vs_lama,
    // URL gambar hanya bisa dikelola dari admin (Cloudinary). File Excel tidak
    // pernah memuat gambar, jadi snapshot memulai dengan array kosong.
    image_urls: [],
    is_active: true,
    created_at: now,
    updated_at: now,
  }));
  writeSnapshot(snapshot);

  if (snapshotOnly) {
    console.log("• --snapshot-only: tidak menghubungi Supabase.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "\nNEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local.\n" +
        "Isi dulu (lihat docs/SETUP.md), lalu jalankan ulang: npm run db:seed\n" +
        "Snapshot lokal sudah ditulis, jadi storefront tetap bisa jalan sementara."
    );
    process.exit(1);
  }

  const { getSupabaseServiceClient } = await import("../lib/supabase/service");
  const supabase = getSupabaseServiceClient();

  const { data: existing, error: fetchError } = await supabase.from("products").select("*");
  if (fetchError) {
    console.error(`Gagal membaca produk existing: ${fetchError.message}`);
    console.error("Pastikan migrasi supabase/migrations sudah dijalankan.");
    process.exit(1);
  }

  const diff = computeImportDiff(parsed.rows, (existing || []) as ProductRow[], parsed.errors);
  console.log(
    `• Diff: ${diff.added.length} baru, ${diff.changed.length} berubah, ` +
      `${diff.missing.length} tidak ada di file (${missingAction}), ${diff.unchanged} tidak berubah`
  );

  const result = await applyImport(supabase, diff, {
    filename: filePath.replace(/^.*[\\/]/, ""),
    source: "seed",
    missingAction,
    actorId: null,
    actorEmail: "seed-script",
  });

  console.log(
    `\nSelesai. Ditambah: ${result.added}, Diubah: ${result.changed}, ` +
      `Dinonaktifkan: ${result.deactivated}, Dihapus: ${result.deleted}, Error: ${result.errorCount}`
  );
  if (result.errorCount > 0) {
    result.errors.slice(0, 20).forEach((error) =>
      console.log(`  ✗ baris ${error.rowNumber ?? "-"}: ${error.message}`)
    );
  }
  console.log(
    "• Gambar produk tidak diubah oleh seed. Kelola lewat /admin/products → Ubah → Gambar."
  );
}

main().catch((error) => {
  console.error("Terjadi kesalahan tak terduga:", error);
  process.exit(1);
});
