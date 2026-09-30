import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getProductById } from "@/lib/admin-products";
import { setScreenCategory, autoDetectScreenCategory } from "@/lib/product-screen";
import type { ScreenCategory } from "@/lib/screen-category";

export const dynamic = "force-dynamic";

const screenSchema = z.object({
  // 'auto' = reset ke hasil deteksi otomatis dari spesifikasi.
  kategori: z.enum(["14", "15", "16", "belum", "auto"]),
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

  const parsed = screenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const id = context.params.id;
    let kategori: ScreenCategory;

    if (parsed.data.kategori === "auto") {
      const product = await getProductById(id);
      if (!product) {
        return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
      }
      kategori = await autoDetectScreenCategory(id, product.spesifikasi);
      // autoDetect tidak menimpa baris manual; paksa reset ke auto di sini.
      await setScreenCategory(id, kategori, "auto");
    } else {
      kategori = parsed.data.kategori;
      await setScreenCategory(id, kategori, "manual");
    }

    return NextResponse.json({ ok: true, kategori });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan kategori layar. Pastikan migrasi 20261004000000 sudah dijalankan.",
      },
      { status: 500 }
    );
  }
}
