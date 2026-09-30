import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { regroupProducts } from "@/lib/product-color";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const result = await regroupProducts(false);
    revalidateTag(PRODUCTS_CACHE_TAG);
    const { changes, ...summary } = result;
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengelompokkan ulang. Pastikan migrasi 20261006000000 sudah dijalankan.",
      },
      { status: 500 }
    );
  }
}
