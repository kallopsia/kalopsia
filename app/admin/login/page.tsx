import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { SUPABASE_MISSING_MESSAGE, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Masuk Admin — KALOPSIA TECH",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: { error?: string; next?: string };
}

const ERROR_TEXT: Record<string, string> = {
  "not-configured": SUPABASE_MISSING_MESSAGE,
  "not-authenticated": "Sesi berakhir atau belum masuk. Silakan login ulang.",
  forbidden: "Akun ini bukan admin. Set app_metadata.role = 'admin' di Supabase (lihat docs/SETUP.md).",
  "invalid-credentials": "Email atau password salah.",
};

export default function AdminLoginPage({ searchParams }: LoginPageProps) {
  const errorCode = searchParams.error || "";
  const message = ERROR_TEXT[errorCode] || (errorCode ? "Tidak bisa masuk. Coba lagi." : "");

  return (
    <div className="w-full flex-1 flex items-start justify-center bg-[#F5F5F5] px-[16px] py-[48px] md:py-[96px]">
      <div className="w-full max-w-[400px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          KALOPSIA TECH // ADMIN
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12] mb-[24px]">
          masuk area admin
        </h1>

        {message && (
          <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
            {message}
          </div>
        )}

        <LoginForm nextPath={searchParams.next ? decodeURIComponent(searchParams.next) : "/admin"} />
      </div>
    </div>
  );
}
