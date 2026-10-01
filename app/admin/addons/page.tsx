import { requireAdmin } from "@/lib/auth";
import { getAllAddons } from "@/lib/addons";
import AddonPriceForm from "@/components/admin/AddonPriceForm";
import type { ProductAddonRow } from "@/types/addon";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Add-on" };

export default async function AdminAddonsPage() {
  await requireAdmin();

  let addons: ProductAddonRow[] = [];
  let error = "";
  try {
    addons = await getAllAddons();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // ADD-ON
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          harga anti gores
        </h1>
        <p className="mt-[8px] max-w-[640px] text-[13px] leading-[1.6] text-[#767676]">
          Harga berlaku global untuk semua produk dan ditampilkan sebagai pilihan opsional
          di halaman detail produk. Add-on yang dipilih pembeli ikut masuk ke pesan WhatsApp.
        </p>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[16px] max-w-[720px] text-[12px] leading-[1.6] text-[#B00020]">
          Gagal membaca tabel product_addons: {error}. Jalankan migrasi
          supabase/migrations/20261002000000_product_addons.sql terlebih dulu.
        </div>
      )}

      {!error && addons.length === 0 && (
        <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] mb-[16px] max-w-[720px] text-[12px] leading-[1.6] text-[#767676]">
          Tabel product_addons kosong. Jalankan ulang seed migrasi
          20261002000000_product_addons.sql untuk membuat empat kombinasi awal.
        </div>
      )}

      {addons.length > 0 && <AddonPriceForm addons={addons} />}
    </div>
  );
}
