import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listSoftware } from "@/lib/admin-services";
import { formatServicePrice } from "@/lib/pricing";
import { productPlaceholder } from "@/lib/placeholder";
import ServiceRowActions from "@/components/admin/ServiceRowActions";
import {
  badgeClass,
  cardClass,
  primaryButtonClass,
  tableCellClass,
  tableHeadClass,
} from "@/components/admin/styles";
import type { SoftwareRow } from "@/types/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Install Software" };

export default async function AdminSoftwarePage() {
  await requireAdmin();

  let rows: SoftwareRow[] = [];
  let error = "";

  try {
    rows = await listSoftware();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="w-full">
      <div className="mb-[16px] flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            ADMIN // LAYANAN
          </div>
          <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
            install software
          </h1>
        </div>
        <Link href="/admin/software/new" className={primaryButtonClass}>
          tambah software
        </Link>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[16px] text-[12px] leading-[1.6] text-[#B00020]">
          Gagal membaca software: {error}
          <div className="mt-[8px] text-[#767676]">
            Jalankan migrasi <code>20261001000000_add_services_and_spareparts.sql</code> di
            Supabase SQL Editor.
          </div>
        </div>
      )}

      <div className="mb-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        {rows.length} software terdaftar
      </div>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[880px] border-collapse">
          <thead className="border-b border-[#D6D6D6]">
            <tr>
              <th className={tableHeadClass}>Gambar</th>
              <th className={tableHeadClass}>Nama</th>
              <th className={tableHeadClass}>Slug</th>
              <th className={tableHeadClass}>Harga jasa</th>
              <th className={tableHeadClass}>Status</th>
              <th className={`${tableHeadClass} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6D6D6]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-[16px] text-[13px] text-[#767676]">
                  Belum ada software. Tambahkan lewat tombol di atas.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={tableCellClass}>
                    <span className="relative block w-[48px] h-[36px] border border-[#D6D6D6] bg-[#F5F5F5] overflow-hidden">
                      <Image
                        src={row.image_url || productPlaceholder(row.nama)}
                        alt={row.nama}
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    </span>
                  </td>
                  <td className={tableCellClass}>
                    <Link
                      href={`/admin/software/${row.id}`}
                      className="text-[13px] text-[#0F0E12] hover:text-[#0071BB] transition-colors"
                    >
                      {row.nama}
                    </Link>
                  </td>
                  <td className={`${tableCellClass} text-[12px] text-[#767676] break-all`}>
                    {row.slug}
                  </td>
                  <td className={`${tableCellClass} whitespace-nowrap tabular-nums`}>
                    {row.harga > 0 ? (
                      formatServicePrice(row.harga)
                    ) : (
                      <span className={badgeClass("grey")}>hubungi kami</span>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <span className={badgeClass(row.is_active ? "green" : "grey")}>
                      {row.is_active ? "aktif" : "nonaktif"}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-right`}>
                    <ServiceRowActions
                      kind="software"
                      id={row.id}
                      nama={row.nama}
                      isActive={row.is_active}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
