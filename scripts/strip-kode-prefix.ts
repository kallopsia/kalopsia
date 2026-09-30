/**
 * Migrasi sekali-jalan: buang prefix "PR-LAP-<KODE BRAND>-" dari kode_barang.
 *
 *   npx tsx scripts/strip-kode-prefix.ts
 *
 * Kode yang hasil strip-nya bentrok dengan kode produk lain TIDAK diubah
 * otomatis; daftarnya dilaporkan supaya bisa ditinjau manual.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { hasKodePrefix, stripKodePrefix } from "../lib/kode-barang";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Update dikirim paralel per batch kecil supaya tidak membanjiri PostgREST.
const UPDATE_BATCH = 50;

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

type Row = { id: string; kode_barang: string };
type Plan = { id: string; oldKode: string; newKode: string };
type Collision = { oldKode: string; newKode: string; reason: string };

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "\nNEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local.\n" +
        "Isi dulu (lihat docs/SETUP.md), lalu jalankan ulang: npx tsx scripts/strip-kode-prefix.ts"
    );
    process.exit(1);
  }

  const { getSupabaseServiceClient } = await import("../lib/supabase/service");
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase.from("products").select("id,kode_barang");
  if (error) {
    console.error(`Gagal membaca produk: ${error.message}`);
    process.exit(1);
  }
  const rows = (data || []) as Row[];
  console.log(`• Terbaca ${rows.length} baris produk.`);

  // Kode final baris yang tidak ikut berubah (tanpa prefix) dipakai sebagai
  // pembanding tabrakan.
  const untouchedKode = new Map<string, string>();
  rows.forEach((row) => {
    if (!hasKodePrefix(row.kode_barang)) untouchedKode.set(row.kode_barang, row.id);
  });

  const plans: Plan[] = [];
  const collisions: Collision[] = [];
  const plannedKode = new Map<string, string>();

  rows.forEach((row) => {
    if (!hasKodePrefix(row.kode_barang)) return;
    const newKode = stripKodePrefix(row.kode_barang);

    const untouchedId = untouchedKode.get(newKode);
    if (untouchedId) {
      collisions.push({
        oldKode: row.kode_barang,
        newKode,
        reason: `kode tujuan sudah dipakai produk lain (id ${untouchedId})`,
      });
      return;
    }
    const firstId = plannedKode.get(newKode);
    if (firstId) {
      collisions.push({
        oldKode: row.kode_barang,
        newKode,
        reason: `berebut kode tujuan yang sama dengan baris id ${firstId}`,
      });
      return;
    }
    plannedKode.set(newKode, row.id);
    plans.push({ id: row.id, oldKode: row.kode_barang, newKode });
  });

  if (plans.length === 0) {
    console.log("• Tidak ada kode_barang ber-prefix PR-LAP-XX- yang perlu diubah.");
  }

  let changed = 0;
  const failed: { plan: Plan; message: string }[] = [];
  for (let i = 0; i < plans.length; i += UPDATE_BATCH) {
    const batch = plans.slice(i, i + UPDATE_BATCH);
    // update per baris (bukan upsert): hanya kode_barang yang berubah,
    // kolom lain tidak disentuh sama sekali.
    const results = await Promise.all(
      batch.map((plan) =>
        supabase
          .from("products")
          .update({ kode_barang: plan.newKode })
          .eq("id", plan.id)
          .then(({ error }) => ({ plan, error }))
      )
    );
    results.forEach(({ plan, error }) => {
      if (error) failed.push({ plan, message: error.message });
      else changed += 1;
    });
  }

  console.log(`• Diubah: ${changed} baris.`);
  if (failed.length > 0) {
    console.log(`✗ Gagal memperbarui ${failed.length} baris:`);
    failed.forEach((item) => console.log(`  - ${item.plan.oldKode}: ${item.message}`));
  }
  if (collisions.length > 0) {
    console.log(`• Dilewati karena bentrok: ${collisions.length} baris — tinjau manual:`);
    collisions.forEach((collision) =>
      console.log(`  - ${collision.oldKode} → ${collision.newKode}: ${collision.reason}`)
    );
  } else {
    console.log("• Tidak ada tabrakan kode; semua baris ber-prefix berhasil diubah.");
  }
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Terjadi kesalahan tak terduga:", error);
  process.exit(1);
});
