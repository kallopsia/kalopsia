import { requireAdmin } from "@/lib/auth";
import { getWindowsInstallSetting } from "@/lib/admin-services";
import WindowsInstallForm from "@/components/admin/WindowsInstallForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Install Ulang Windows" };

export default async function AdminWindowsInstallPage() {
  await requireAdmin();

  let setting = null as Awaited<ReturnType<typeof getWindowsInstallSetting>>;
  let error = "";

  try {
    setting = await getWindowsInstallSetting();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // LAYANAN
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          install ulang windows
        </h1>
        <p className="mt-[8px] max-w-[720px] text-[13px] leading-[1.6] text-[#767676]">
          Biaya di bawah tampil apa adanya di halaman{" "}
          <span className="text-[#0F0E12]">/lainnya/install-ulang-windows</span>. Simpan untuk
          memperbarui; halaman publik ikut ter-refresh.
        </p>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[16px] max-w-[720px] text-[12px] leading-[1.6] text-[#B00020]">
          Tidak bisa membaca database: {error}
          <div className="mt-[8px] text-[#767676]">
            Jalankan migrasi <code>20261001000000_add_services_and_spareparts.sql</code> di
            Supabase SQL Editor.
          </div>
        </div>
      )}

      <WindowsInstallForm
        initialHarga={setting ? Number(setting.harga) || 0 : 0}
        initialDeskripsi={setting?.deskripsi || ""}
        updatedAt={setting?.updated_at || null}
      />
    </div>
  );
}
