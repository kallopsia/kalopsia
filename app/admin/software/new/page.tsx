import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import ServiceItemForm from "@/components/admin/ServiceItemForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Tambah Software — KALOPSIA TECH" };

export default async function NewSoftwarePage() {
  await requireAdmin();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          <Link href="/admin/software" className="hover-underline-anim">
            ADMIN // SOFTWARE
          </Link>{" "}
          / TAMBAH
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          tambah software
        </h1>
      </div>

      <ServiceItemForm
        kind="software"
        mode="create"
        cloudinary={getCloudinaryPublicConfig()}
      />
    </div>
  );
}
