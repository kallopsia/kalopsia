import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { recategorizeAllScreens } from "@/lib/product-screen";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ onlyUncategorized: z.boolean().optional() });

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = bodySchema.safeParse(body ?? {});
  const onlyUncategorized = parsed.success ? parsed.data.onlyUncategorized === true : false;

  try {
    const result = await recategorizeAllScreens(onlyUncategorized);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengkategorikan ulang. Pastikan migrasi 20261004000000 sudah dijalankan.",
      },
      { status: 500 }
    );
  }
}
