// Logika server-only untuk deteksi warna + pengelompokan varian produk.
// Menyimpan hasil ke kolom products: warna_kode, warna_canon, warna_source,
// group_slug, duplikat_warna (migrasi 20261006000000).
import { getSupabaseServiceClient } from "./supabase/service";
import { detectColor, specSansColor, variantGroupingKey, type DetectedColor } from "./color-category";
import { productSlug, productName } from "./product-view";
import type { ProductRow } from "@/types/product";

// Warna dicari dari spesifikasi dulu (tempat kode warna biasa berada),
// lalu fallback ke nama_produk bila admin menaruh warna di sana.
export function pickColor(
  namaProduk: string | null | undefined,
  spesifikasi: string | null | undefined
): DetectedColor | null {
  return detectColor(spesifikasi) || detectColor(namaProduk);
}

type Row = Pick<
  ProductRow,
  | "id"
  | "kode_barang"
  | "spesifikasi"
  | "nama_produk"
  | "is_active"
  | "warna_kode"
  | "warna_canon"
  | "warna_source"
  | "group_slug"
  | "duplikat_warna"
>;

// Deteksi warna otomatis untuk satu produk; override manual tidak pernah ditimpa.
// Dipanggil saat create/update. Gagal (mis. migrasi belum jalan) → lempar agar
// pemanggil bisa memutuskan (admin-products membungkusnya try/catch).
export async function autoDetectColor(
  productId: string,
  namaProduk: string | null | undefined,
  spesifikasi: string
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { data: current, error: readError } = await supabase
    .from("products")
    .select("warna_source")
    .eq("id", productId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if ((current as { warna_source?: string } | null)?.warna_source === "manual") return;

  const color = pickColor(namaProduk, spesifikasi);
  const { error } = await supabase
    .from("products")
    .update({
      warna_kode: color?.code ?? null,
      warna_canon: color?.canonical ?? null,
      warna_source: "auto",
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);
}

// Set warna manual (override admin) lalu hitung ulang grup produk itu.
export async function setManualColor(
  productId: string,
  warnaKode: string | null
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const code = (warnaKode || "").trim();
  const color = code ? detectColor(code) || { code, canonical: code.toUpperCase() } : null;
  const { error } = await supabase
    .from("products")
    .update({
      warna_kode: color?.code ?? null,
      warna_canon: color?.canonical ?? null,
      warna_source: color ? "manual" : "auto",
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);
}

export type RegroupReport = {
  processed: number;
  groups: number;
  grouped: number;
  duplicates: number;
  singleColor: number;
  changed: number;
};

type Change = {
  id: string;
  warna_kode?: string | null;
  warna_canon?: string | null;
  group_slug?: string | null;
  duplikat_warna?: boolean;
};

// Hitung ulang deteksi warna (baris auto) + group_slug + duplikat_warna untuk
// semua produk. dryRun=true hanya mengembalikan laporan tanpa menulis.
export async function regroupProducts(
  dryRun: boolean
): Promise<RegroupReport & { changes: Change[] }> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("products").select(
    "id, kode_barang, spesifikasi, nama_produk, is_active, warna_kode, warna_canon, warna_source, group_slug, duplikat_warna"
  );
  if (error) throw new Error(error.message);
  const all = (data || []) as unknown as Row[];

  // Kategori layar dibaca dari tabel admin-only untuk kunci grup.
  const { getScreenInfoMap } = await import("./product-screen");
  const screenMap = (await getScreenInfoMap(all.map((r) => r.id))) || new Map();

  const active = all.filter((r) => r.is_active);

  type Resolved = {
    row: Row;
    color: DetectedColor | null;
    warnaKode: string | null;
    warnaCanon: string | null;
    key: string;
  };

  const resolved: Resolved[] = active.map((row) => {
    const isManual = row.warna_source === "manual";
    const detected = isManual ? null : pickColor(row.nama_produk, row.spesifikasi);
    const warnaKode = isManual ? (row.warna_kode || null) : detected?.code ?? null;
    const warnaCanon = isManual ? (row.warna_canon || null) : detected?.canonical ?? null;
    const name = (row.nama_produk || "").trim() || productName(row.spesifikasi || "");
    const screen = screenMap.get(row.id);
    const key = variantGroupingKey({
      name,
      spec: row.spesifikasi,
      color: warnaCanon ? { code: warnaKode || "", canonical: warnaCanon } : null,
      screenCategory: screen?.kategori || "belum",
    });
    return { row, color: detected, warnaKode, warnaCanon, key };
  });

  // Produk tanpa warna = warna tunggal, tidak pernah digabung.
  const groupable = resolved.filter((r) => r.warnaCanon);

  // Bucket per kunci grup.
  const byKey = new Map<string, Resolved[]>();
  for (const item of groupable) {
    const list = byKey.get(item.key) || [];
    list.push(item);
    byKey.set(item.key, list);
  }

  const target = new Map<string, { group_slug: string | null; duplikat_warna: boolean }>();
  let groups = 0;
  let grouped = 0;
  let duplicates = 0;

  byKey.forEach((members) => {
    // Bucket per warna kanonik di dalam kunci yang sama.
    const byColor = new Map<string, Resolved[]>();
    for (const m of members) {
      const list = byColor.get(m.warnaCanon as string) || [];
      list.push(m);
      byColor.set(m.warnaCanon as string, list);
    }

    const distinct: Resolved[] = [];
    byColor.forEach((bucket) => {
      if (bucket.length > 1) {
        // Kunci + warna sama >1 → duplikat, TIDAK digabung, tandai untuk review.
        for (const dup of bucket) {
          target.set(dup.row.id, { group_slug: null, duplikat_warna: true });
          duplicates += 1;
        }
      } else {
        distinct.push(bucket[0]);
      }
    });

    if (distinct.length >= 2) {
      // Grup varian: perwakilan = kode_barang terendah (urut ascending).
      distinct.sort((a, b) => a.row.kode_barang.localeCompare(b.row.kode_barang));
      const representativeSlug = productSlug(distinct[0].row.kode_barang);
      groups += 1;
      for (const member of distinct) {
        target.set(member.row.id, {
          group_slug: representativeSlug,
          duplikat_warna: false,
        });
        grouped += 1;
      }
    } else if (distinct.length === 1) {
      target.set(distinct[0].row.id, { group_slug: null, duplikat_warna: false });
    }
  });

  // Produk tanpa warna: pastikan group_slug null + tidak duplikat.
  for (const item of resolved) {
    if (!item.warnaCanon && !target.has(item.row.id)) {
      target.set(item.row.id, { group_slug: null, duplikat_warna: false });
    }
  }

  // Produk non-aktif: bersihkan grup/duplikat agar tidak nyangkut.
  for (const row of all) {
    if (!row.is_active && !target.has(row.id)) {
      target.set(row.id, { group_slug: null, duplikat_warna: false });
    }
  }

  // Susun daftar perubahan (bandingkan dengan nilai tersimpan).
  const changes: Change[] = [];
  const resolvedById = new Map(resolved.map((r) => [r.row.id, r]));
  target.forEach((t, id) => {
    const change: Change = { id };
    let dirty = false;

    const item = resolvedById.get(id);
    if (item && item.row.warna_source !== "manual") {
      if ((item.row.warna_kode || null) !== item.warnaKode) {
        change.warna_kode = item.warnaKode;
        dirty = true;
      }
      if ((item.row.warna_canon || null) !== item.warnaCanon) {
        change.warna_canon = item.warnaCanon;
        dirty = true;
      }
    }
    const original = all.find((r) => r.id === id);
    if ((original?.group_slug || null) !== (t.group_slug || null)) {
      change.group_slug = t.group_slug;
      dirty = true;
    }
    if (Boolean(original?.duplikat_warna) !== t.duplikat_warna) {
      change.duplikat_warna = t.duplikat_warna;
      dirty = true;
    }
    if (dirty) changes.push(change);
  });

  const singleColor = resolved.filter((r) => !r.warnaCanon).length;

  if (!dryRun && changes.length > 0) {
    const CHUNK = 50;
    for (let i = 0; i < changes.length; i += CHUNK) {
      const slice = changes.slice(i, i + CHUNK);
      await Promise.all(
        slice.map((change) => {
          const { id, ...fields } = change;
          return supabase.from("products").update(fields).eq("id", id).then(({ error }) => {
            if (error) throw new Error(error.message);
          });
        })
      );
    }
  }

  return {
    processed: all.length,
    groups,
    grouped,
    duplicates,
    singleColor,
    changed: changes.length,
    changes,
  };
}
