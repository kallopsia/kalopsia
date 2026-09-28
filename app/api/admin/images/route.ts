import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { bulkSetImages } from "@/lib/admin-products";
import { parseBulkImageCsv } from "@/lib/product-schema";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ csv: z.string().min(1, "CSV kosong") });

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

  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  const { entries, errors } = parseBulkImageCsv(parsedBody.data.csv);
  if (entries.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada baris valid. Format: kode_barang,image_url", errors },
      { status: 400 }
    );
  }

  try {
    const result = await bulkSetImages(entries);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      missing: result.missing,
      errors,
      processed: entries.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan gambar." },
      { status: 500 }
    );
  }
}
