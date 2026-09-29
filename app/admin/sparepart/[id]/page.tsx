import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSparepartById } from "@/lib/admin-services";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import ServiceItemForm from "@/components/admin/ServiceItemForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Ubah Sparepart — KALOPSIA TECH" };

interface EditSparepartPageProps {
  params: { id: string };
}

export default async function EditSparepartPage({ params }: EditSparepartPageProps) {
  await requireAdmin();

  let sparepart = null;
  try {
    sparepart = await getSparepartById(params.id);
  } catch {
    sparepart = null;
  }

  if (!sparepart) notFound();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          <Link href="/admin/sparepart" className="hover-underline-anim">
            ADMIN // SPAREPART
          </Link>{" "}
          / UBAH
        </div>
        <h1 className="text-[20px] md:text-[24px] font-light leading-tight text-[#0F0E12] break-all">
          {sparepart.nama}
        </h1>
        <div className="mt-[4px] flex flex-wrap items-center gap-x-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <span>diperbarui {new Date(sparepart.updated_at).toLocaleString("id-ID")}</span>
          <Link
            href={`/lainnya/sparepart/${sparepart.slug}`}
            className="text-[#0071BB] hover-underline-anim"
          >
            lihat di toko
          </Link>
        </div>
      </div>

      <ServiceItemForm
        kind="sparepart"
        mode="edit"
        itemId={sparepart.id}
        cloudinary={getCloudinaryPublicConfig()}
        initial={{
          nama: sparepart.nama,
          slug: sparepart.slug,
          image_url: sparepart.image_url || "",
          harga: Number(sparepart.harga) || 0,
          text: sparepart.deskripsi || "",
          is_active: sparepart.is_active,
        }}
      />
    </div>
  );
}
