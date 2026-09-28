import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Tambah Produk — KALOPSIA TECH" };

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          <Link href="/admin/products" className="hover-underline-anim">
            ADMIN // PRODUK
          </Link>{" "}
          / TAMBAH
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          tambah produk manual
        </h1>
      </div>

      <ProductForm mode="create" cloudinary={getCloudinaryPublicConfig()} />
    </div>
  );
}
