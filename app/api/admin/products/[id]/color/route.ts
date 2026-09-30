import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getProductById } from "@/lib/admin-products";
import { autoDetectColor, setManualColor, regroupProducts } from "@/lib/product-color";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const colorSchema = z.object({
  // 'auto' = reset ke hasil deteksi otomatis; null = tanpa warna (warna tunggal).
  warna: z.string().trim().max(60).nullable().or(z.literal("auto")),
});

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = colorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const id = context.params.id;
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (parsed.data.warna === "auto") {
      await autoDetectColor(id, product.nama_produk, product.spesifikasi);
    } else {
      await setManualColor(id, parsed.data.warna);
    }

    // Warna berubah → hitung ulang grup varian seluruh katalog.
    await regroupProducts(false);
    revalidateTag(PRODUCTS_CACHE_TAG);

    const fresh = await getProductById(id);
    return NextResponse.json({
      ok: true,
      warnaKode: fresh?.warna_kode ?? null,
      warnaCanon: fresh?.warna_canon ?? null,
      warnaSource: fresh?.warna_source ?? "auto",
      groupSlug: fresh?.group_slug ?? null,
      duplikat: Boolean(fresh?.duplikat_warna),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan warna. Pastikan migrasi 20261006000000 sudah dijalankan.",
      },
      { status: 500 }
    );
  }
}
