/**
 * Sinkronisasi foto produk dari Cloudinary ke tabel product_photos.
 *
 *   npx tsx scripts/sync-photos.ts                # dry-run (default, wajib dilihat dulu)
 *   npx tsx scripts/sync-photos.ts --apply        # tulis rencana ke database
 *   npx tsx scripts/sync-photos.ts --overwrite    # termasuk SKU yang sudah punya foto manual
 *   npx tsx scripts/sync-photos.ts --prefix laptop
 *
 * Dry-run tidak menulis apa pun dan melaporkan:
 *   (a) SKU yang akan terisi beserta jumlah foto + folder sumber,
 *   (b) folder pemetaan yang kosong / tidak ada di Cloudinary,
 *   (c) folder di Cloudinary yang berisi foto tapi tidak ditunjuk SKU mana pun,
 *   (d) berkas non-gambar yang dilewati.
 * Selain itu daftar SKU yang masih menyimpan foto sinkron dari folder yang kini
 * kosong (baris tersebut tidak dihapus otomatis).
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

function flagValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const overwrite = args.includes("--overwrite");
  const prefix = flagValue(args, "--prefix") || undefined;

  loadEnv();

  const { runPhotoSyncDryRun, applyPhotoSyncPlan } = await import("../lib/admin-photos");
  const { CLOUDINARY_FOLDER_PREFIX } = await import("../lib/photo-config");

  console.log(
    `\n${apply ? "MENERAPKAN" : "DRY-RUN"} — sinkron foto (prefix folder: ${prefix || CLOUDINARY_FOLDER_PREFIX})` +
      (overwrite ? ", mode timpa" : "") +
      "\n"
  );

  const report = await runPhotoSyncDryRun({ overwrite, prefix });

  report.warnings.forEach((warning) => console.log(`  ! ${warning}`));

  const s = report.summary;
  console.log("• Ringkasan:");
  console.log(`    SKU terpemetaan            ${s.skusMapped}`);
  console.log(`    folder terpakai            ${s.foldersMapped}`);
  console.log(`    aset foto terbaca          ${s.assetsRead}`);
  console.log(`    SKU akan diisi foto        ${s.skusToWrite} (baru ${s.skusFilled}, diperbarui ${s.skusUpdated})`);
  console.log(`    foto akan ditulis          ${s.photosToWrite}  |  barus lama dihapus ${s.photosRemoved}`);
  console.log(`    SKU sudah cocok (lewati)   ${s.skusUnchanged}`);
  console.log(`    SKU dilindungi (manual)    ${s.skusProtected}`);
  console.log(`    SKU tanpa foto             ${s.skusWithoutPhotos}`);
  console.log(`    folder kosong/tidak ada    ${s.foldersEmpty}`);
  console.log(`    SKU foto basi              ${s.skusStalePhotos}`);
  console.log(`    folder yatim               ${s.foldersOrphan}  |  brand nonaktif ${s.foldersExcluded}`);
  console.log(`    berkas dilewati            ${s.filesSkipped}  |  lewat batas ${s.filesTruncated}`);

  const writes = report.writePlans.slice(0, 60);
  if (writes.length > 0) {
    console.log(`\n• (a) SKU yang akan terisi (maks 60):`);
    writes.forEach((plan) =>
      console.log(
        `    ${plan.kode_barang}`.padEnd(26) +
          `${plan.photos.length} foto`.padEnd(10) +
          `${plan.action}  ← ${plan.folder}`
      )
    );
    if (report.writePlans.length > writes.length) {
      console.log(`    … ${report.writePlans.length - writes.length} SKU lainnya`);
    }
  }

  if (report.emptyFolders.length > 0) {
    console.log(`\n• (b) folder pemetaan yang kosong / belum ada di Cloudinary (maks 40):`);
    report.emptyFolders.slice(0, 40).forEach((folder) =>
      console.log(
        `    ${folder.folder}`.padEnd(34) +
          `${folder.existsInCloudinary ? "folder ada, isinya kosong" : "folder belum dibuat"} — ${folder.skuCount} SKU`
      )
      );
    if (report.emptyFolders.length > 40) console.log(`    … ${report.emptyFolders.length - 40} folder lainnya`);
  }

  if (report.stalePhotos.length > 0) {
    console.log(`\n• Foto sinkron lama yang tetap tersimpan (folder kini kosong, maks 40):`);
    report.stalePhotos.slice(0, 40).forEach((item) =>
      console.log(`    ${item.kode_barang}`.padEnd(26) + `${item.publicIds.length} baris  ← ${item.folder}`)
    );
    if (report.stalePhotos.length > 40) console.log(`    … ${report.stalePhotos.length - 40} SKU lainnya`);
  }

  if (report.orphanFolders.length > 0) {
    console.log(`\n• (c) folder di Cloudinary tanpa pemetaan (maks 40):`);
    report.orphanFolders.slice(0, 40).forEach((folder) => console.log(`    - ${folder}`));
    if (report.orphanFolders.length > 40) console.log(`    … ${report.orphanFolders.length - 40} folder lainnya`);
  }

  if (report.excludedFolders.length > 0) {
    console.log(`\n• Folder brand nonaktif yang diabaikan (${report.excludedFolders.length}):`);
    report.excludedFolders.slice(0, 20).forEach((folder) => console.log(`    - ${folder}`));
  }

  if (report.skippedFiles.length > 0) {
    console.log(`\n• (d) berkas non-gambar, dilewati (maks 40):`);
    report.skippedFiles.slice(0, 40).forEach((file) =>
      console.log(`    ${file.folder}/${file.fileName} (${file.reason})`)
    );
    if (report.skippedFiles.length > 40) console.log(`    … ${report.skippedFiles.length - 40} berkas lainnya`);
  }

  if (report.truncatedFiles.length > 0) {
    console.log(`\n• Berkas melewati batas 24 foto per produk (maks 40):`);
    report.truncatedFiles.slice(0, 40).forEach((file) => console.log(`    ${file.folder}/${file.fileName}`));
  }

  if (!apply) {
    console.log("\nDry-run selesai. Tidak ada yang disimpan. Tambahkan --apply untuk menulis.");
    return;
  }

  const result = await applyPhotoSyncPlan(report);
  console.log(
    `\n• Selesai. ${result.products} SKU diperbarui, ${result.photos} baris product_photos ditulis, ` +
      `${result.removed} baris sinkron lama dihapus.`
  );
  console.log("  Foto tampil = kurasi manual admin (products.image_urls) lalu hasil sinkron.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
