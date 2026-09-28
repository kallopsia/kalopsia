import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProductById } from "@/lib/admin-products";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Ubah Produk — KALOPSIA TECH" };

interface EditProductPageProps {
  params: { id: string };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requireAdmin();

  let product = null;
  try {
    product = await getProductById(params.id);
  } catch {
    product = null;
  }

  if (!product) notFound();

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          <Link href="/admin/products" className="hover-underline-anim">
            ADMIN // PRODUK
          </Link>{" "}
          / UBAH
        </div>
        <h1 className="text-[20px] md:text-[24px] font-light leading-tight text-[#0F0E12] break-all">
          {product.kode_barang}
        </h1>
        <div className="mt-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          diperbarui {new Date(product.updated_at).toLocaleString("id-ID")}
        </div>
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        cloudinary={getCloudinaryPublicConfig()}
        initial={{
          kode_barang: product.kode_barang,
          spesifikasi: product.spesifikasi,
          notes: product.notes,
          srp: Number(product.srp) || 0,
          is_active: product.is_active,
          is_featured: product.is_featured === true,
          image_urls: product.image_urls || [],
        }}
      />

      <p className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        Impor Excel tidak pernah mengubah gambar; gambar hanya dikelola dari halaman ini.
      </p>
    </div>
  );
}
