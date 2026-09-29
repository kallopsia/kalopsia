import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSparepart, listSpareparts } from "@/lib/admin-services";
import { sparepartInputSchema } from "@/lib/service-schema";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function guard() {
  try {
    await requireAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    return NextResponse.json({ rows: await listSpareparts() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membaca sparepart." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = sparepartInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const sparepart = await createSparepart(parsed.data);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true, sparepart }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan sparepart.";
    const duplicate = /duplicate|unique/i.test(message);
    return NextResponse.json(
      { error: duplicate ? "Slug sudah dipakai sparepart lain." : message },
      { status: duplicate ? 409 : 500 }
    );
  }
}
