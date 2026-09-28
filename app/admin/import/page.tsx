import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import ImportPanel from "@/components/admin/ImportPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Impor Excel — KALOPSIA TECH" };

export default async function AdminImportPage() {
  await requireAdmin();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // IMPOR EXCEL
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          impor daftar harga
        </h1>
        <p className="mt-[8px] max-w-[720px] text-[13px] leading-[1.6] text-[#767676]">
          Unggah file .xlsx bulanan. Perubahan ditampilkan sebagai diff sebelum disimpan; impor
          bersifat idempoten (file yang sama dua kali = 0 perubahan).{" "}
          <Link href="/admin/products" className="text-[#0071BB] hover-underline-anim">
            kelola produk
          </Link>
        </p>
      </div>

      <ImportPanel />
    </div>
  );
}
