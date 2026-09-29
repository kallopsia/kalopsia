import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSoftwareById } from "@/lib/admin-services";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import ServiceItemForm from "@/components/admin/ServiceItemForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Ubah Software — KALOPSIA TECH" };

interface EditSoftwarePageProps {
  params: { id: string };
}

export default async function EditSoftwarePage({ params }: EditSoftwarePageProps) {
  await requireAdmin();

  let software = null;
  try {
    software = await getSoftwareById(params.id);
  } catch {
    software = null;
  }

  if (!software) notFound();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          <Link href="/admin/software" className="hover-underline-anim">
            ADMIN // SOFTWARE
          </Link>{" "}
          / UBAH
        </div>
        <h1 className="text-[20px] md:text-[24px] font-light leading-tight text-[#0F0E12] break-all">
          {software.nama}
        </h1>
        <div className="mt-[4px] flex flex-wrap items-center gap-x-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <span>diperbarui {new Date(software.updated_at).toLocaleString("id-ID")}</span>
          <Link
            href={`/lainnya/install-software/${software.slug}`}
            className="text-[#0071BB] hover-underline-anim"
          >
            lihat di toko
          </Link>
        </div>
      </div>

      <ServiceItemForm
        kind="software"
        mode="edit"
        itemId={software.id}
        cloudinary={getCloudinaryPublicConfig()}
        initial={{
          nama: software.nama,
          slug: software.slug,
          image_url: software.image_url || "",
          harga: Number(software.harga) || 0,
          text: software.spesifikasi_minimum || "",
          is_active: software.is_active,
        }}
      />
    </div>
  );
}
