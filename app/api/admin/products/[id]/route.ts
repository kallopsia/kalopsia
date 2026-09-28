import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { deleteProduct, setProductActive, updateProduct } from "@/lib/admin-products";
import { productInputSchema } from "@/lib/product-schema";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const quickToggleSchema = z.object({ is_active: z.boolean() }).strict();

type RouteContext = { params: { id: string } };

async function guard() {
  try {
    await requireAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  try {
    const toggle = quickToggleSchema.safeParse(body);
    if (toggle.success) {
      const product = await setProductActive(context.params.id, toggle.data.is_active);
      revalidateTag(PRODUCTS_CACHE_TAG);
      return NextResponse.json({ ok: true, product });
    }

    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
        { status: 400 }
      );
    }

    // kode_barang adalah kunci dari Excel dan tidak bisa diubah lewat form.
    const product = await updateProduct(context.params.id, parsed.data);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui produk." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guard();
  if (denied) return denied;

  try {
    await deleteProduct(context.params.id);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus produk." },
      { status: 500 }
    );
  }
}
