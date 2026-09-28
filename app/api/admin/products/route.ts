import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createProduct, listProducts } from "@/lib/admin-products";
import { productInputSchema } from "@/lib/product-schema";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const result = await listProducts({
      page: Number(searchParams.get("page")) || 1,
      q: searchParams.get("q") || "",
      status: (searchParams.get("status") as "all" | "active" | "inactive") || "all",
      noImage: searchParams.get("noImage") === "1",
      srpZero: searchParams.get("srpZero") === "1",
      brand: searchParams.get("brand") || "",
      sort: searchParams.get("sort") || "kode_barang",
      dir: searchParams.get("dir") === "desc" ? "desc" : "asc",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membaca produk." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const product = await createProduct(parsed.data);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan produk.";
    const status = /duplicate|unique/i.test(message) ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "Kode barang sudah dipakai produk lain." : message },
      { status }
    );
  }
}
