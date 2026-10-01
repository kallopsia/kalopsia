import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, getRecentImportLogs } from "@/lib/admin-products";
import { badgeClass, cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/admin/styles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Ringkasan" };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  let stats = null as Awaited<ReturnType<typeof getDashboardStats>> | null;
  let logs: Awaited<ReturnType<typeof getRecentImportLogs>> = [];
  let error = "";

  try {
    stats = await getDashboardStats();
    logs = await getRecentImportLogs(8);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="w-full">
      <div className="mb-[24px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // RINGKASAN
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          katalog produk
        </h1>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[24px] text-[12px] leading-[1.6] text-[#B00020]">
          Tidak bisa membaca database: {error}
          <div className="mt-[8px] text-[#767676]">
            Jalankan migrasi di <code>supabase/migrations</code> dan isi env sesuai{" "}
            <code>docs/SETUP.md</code>.
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6] mb-[24px]">
          {[
            { label: "Total produk", value: stats.total, href: "/admin/products" },
            { label: "Aktif", value: stats.active, href: "/admin/products?status=active" },
            { label: "Nonaktif", value: stats.inactive, href: "/admin/products?status=inactive" },
            { label: "Tanpa gambar", value: stats.noImage, href: "/admin/products?noImage=1" },
            { label: "SRP 0", value: stats.srpZero, href: "/admin/products?srpZero=1" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="bg-[#FFFFFF] p-[16px] hover:bg-[#F5F5F5] transition-colors"
            >
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
                {item.label}
              </div>
              <div className="text-[24px] tabular-nums text-[#0F0E12]">{item.value}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-[8px] mb-[32px]">
        <Link href="/admin/import" className={primaryButtonClass}>
          impor excel
        </Link>
        <Link href="/admin/products/new" className={secondaryButtonClass}>
          tambah produk
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-[8px]">
          <h2 className="text-[14px] uppercase tracking-[0.08em] text-[#0F0E12]">
            riwayat impor terakhir
          </h2>
          <span className={badgeClass("grey")}>import_logs</span>
        </div>

        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-[#D6D6D6]">
              <tr>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-left p-[12px]">
                  Waktu
                </th>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-left p-[12px]">
                  File
                </th>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-left p-[12px]">
                  Sumber
                </th>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-right p-[12px]">
                  Baru
                </th>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-right p-[12px]">
                  Berubah
                </th>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-right p-[12px]">
                  Nonaktif
                </th>
                <th className="text-[11px] uppercase tracking-[0.08em] text-[#767676] text-right p-[12px]">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6D6D6]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-[16px] text-[13px] text-[#767676]">
                    Belum ada aktivitas impor.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-[12px] text-[12px] text-[#767676] whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="p-[12px] text-[13px] text-[#0F0E12] break-all">{log.filename}</td>
                    <td className="p-[12px] text-[12px] uppercase tracking-[0.08em] text-[#767676]">
                      {log.source}
                    </td>
                    <td className="p-[12px] text-[13px] tabular-nums text-right">{log.added_count}</td>
                    <td className="p-[12px] text-[13px] tabular-nums text-right">
                      {log.changed_count}
                    </td>
                    <td className="p-[12px] text-[13px] tabular-nums text-right">
                      {log.deactivated_count + log.deleted_count}
                    </td>
                    <td className="p-[12px] text-[13px] tabular-nums text-right">
                      {log.error_count > 0 ? (
                        <span className={badgeClass("red")}>{log.error_count}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
