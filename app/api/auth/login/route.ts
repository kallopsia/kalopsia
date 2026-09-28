import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isAdminUser, ADMIN_ROLE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi di server. Lihat docs/SETUP.md." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body permintaan tidak valid." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  if (!isAdminUser(data.user)) {
    // Jangan biarkan sesi non-admin bertahan di browser.
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: `Akun ini belum punya peran admin. Set app_metadata.role = "${ADMIN_ROLE}" untuk user tersebut (docs/SETUP.md).`,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, email: data.user.email });
}
