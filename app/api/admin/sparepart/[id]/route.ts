import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { deleteSparepart, setSparepartActive, updateSparepart } from "@/lib/admin-services";
import { sparepartInputSchema } from "@/lib/service-schema";
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
      const sparepart = await setSparepartActive(context.params.id, toggle.data.is_active);
      revalidateTag(PRODUCTS_CACHE_TAG);
      return NextResponse.json({ ok: true, sparepart });
    }

    const parsed = sparepartInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
        { status: 400 }
      );
    }

    const sparepart = await updateSparepart(context.params.id, parsed.data);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true, sparepart });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui sparepart.";
    const duplicate = /duplicate|unique/i.test(message);
    return NextResponse.json(
      { error: duplicate ? "Slug sudah dipakai sparepart lain." : message },
      { status: duplicate ? 409 : 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guard();
  if (denied) return denied;

  try {
    await deleteSparepart(context.params.id);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus sparepart." },
      { status: 500 }
    );
  }
}
