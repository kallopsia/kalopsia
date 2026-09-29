import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import ServiceItemForm from "@/components/admin/ServiceItemForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Tambah Sparepart — KALOPSIA TECH" };

export default async function NewSparepartPage() {
  await requireAdmin();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          <Link href="/admin/sparepart" className="hover-underline-anim">
            ADMIN // SPAREPART
          </Link>{" "}
          / TAMBAH
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          tambah sparepart
        </h1>
      </div>

      <ServiceItemForm kind="sparepart" mode="create" cloudinary={getCloudinaryPublicConfig()} />
    </div>
  );
}
