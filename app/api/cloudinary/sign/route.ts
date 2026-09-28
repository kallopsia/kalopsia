import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createUploadSignature } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// Dipakai untuk signed upload langsung dari browser ke Cloudinary.
// CLOUDINARY_API_SECRET tidak pernah meninggalkan server: hanya signature-nya.
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    return NextResponse.json(createUploadSignature());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat signature." },
      { status: 500 }
    );
  }
}
