import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { deleteSoftware, setSoftwareActive, updateSoftware } from "@/lib/admin-services";
import { softwareInputSchema } from "@/lib/service-schema";
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
      const software = await setSoftwareActive(context.params.id, toggle.data.is_active);
      revalidateTag(PRODUCTS_CACHE_TAG);
      return NextResponse.json({ ok: true, software });
    }

    const parsed = softwareInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
        { status: 400 }
      );
    }

    const software = await updateSoftware(context.params.id, parsed.data);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true, software });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui software.";
    const duplicate = /duplicate|unique/i.test(message);
    return NextResponse.json(
      { error: duplicate ? "Slug sudah dipakai software lain." : message },
      { status: duplicate ? 409 : 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guard();
  if (denied) return denied;

  try {
    await deleteSoftware(context.params.id);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus software." },
      { status: 500 }
    );
  }
}
