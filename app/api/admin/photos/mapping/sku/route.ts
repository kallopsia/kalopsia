import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setSkuFolder } from "@/lib/admin-photo-mapping";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Override folder untuk satu SKU (FITUR 5). folder = null menghapus pemetaan SKU.
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body harus JSON." }, { status: 400 });
  }

  const kode_barang = typeof body.kode_barang === "string" ? body.kode_barang : "";
  const folder = typeof body.folder === "string" ? body.folder : null;

  if (!kode_barang.trim()) {
    return NextResponse.json({ error: "Kode barang wajib diisi." }, { status: 400 });
  }
  if (folder === null && body.action !== "delete") {
    return NextResponse.json(
      { error: "Kirim action='delete' untuk menghapus pemetaan SKU." },
      { status: 400 }
    );
  }

  try {
    await setSkuFolder(kode_barang, folder);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan pemetaan.";
    const status = /brand yang sudah tidak dijual|wajib diisi|tidak boleh kosong/.test(message)
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
