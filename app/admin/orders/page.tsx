import { requireAdmin } from "@/lib/auth";
import { getRecentOrderIntents } from "@/lib/order-intents";
import { formatRupiah, formatServicePrice } from "@/lib/pricing";
import { badgeClass, cardClass, tableCellClass, tableHeadClass } from "@/components/admin/styles";
import type { OrderIntentRow } from "@/types/order-intent";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Pesanan" };

const JENIS_LABEL: Record<OrderIntentRow["jenis"], string> = {
  produk: "Produk",
  software: "Software",
  sparepart: "Sparepart",
  pesan: "Chat",
};

export default async function AdminOrdersPage() {
  await requireAdmin();

  let intents: OrderIntentRow[] = [];
  let error = "";
  try {
    intents = await getRecentOrderIntents(100);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // PESANAN
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          riwayat order intent
        </h1>
        <p className="mt-[8px] max-w-[720px] text-[13px] leading-[1.6] text-[#767676]">
          Setiap klik tombol WhatsApp dicatat di sini beserta snapshot harga produk &amp; add-on
          pada saat transaksi (100 terbaru). Ini bukan pembayaran — hanya jejak minat beli.
        </p>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[16px] max-w-[720px] text-[12px] leading-[1.6] text-[#B00020]">
          Gagal membaca order_intents: {error}. Jalankan migrasi
          supabase/migrations/20261005000000_addon_price_per_screen_and_order_intents.sql terlebih dulu.
        </div>
      )}

      {!error && (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="border-b border-[#D6D6D6]">
              <tr>
                <th className={tableHeadClass}>Waktu</th>
                <th className={tableHeadClass}>Jenis</th>
                <th className={tableHeadClass}>Item</th>
                <th className={tableHeadClass}>Layar</th>
                <th className={tableHeadClass}>Harga produk</th>
                <th className={tableHeadClass}>Add-on</th>
                <th className={`${tableHeadClass} text-right`}>Estimasi total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6D6D6]">
              {intents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-[16px] text-[13px] text-[#767676]">
                    Belum ada order intent tercatat.
                  </td>
                </tr>
              ) : (
                intents.map((intent) => (
                  <tr key={intent.id}>
                    <td className={`${tableCellClass} whitespace-nowrap text-[12px] text-[#767676]`}>
                      {new Date(intent.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className={tableCellClass}>
                      <span className={badgeClass(intent.jenis === "produk" ? "blue" : "grey")}>
                        {JENIS_LABEL[intent.jenis]}
                      </span>
                    </td>
                    <td className={`${tableCellClass} max-w-[280px]`}>
                      <div className="text-[12px] leading-snug">{intent.nama || "-"}</div>
                      {intent.kode && (
                        <div className="text-[11px] text-[#767676] break-all">{intent.kode}</div>
                      )}
                    </td>
                    <td className={`${tableCellClass} text-[12px]`}>
                      {intent.screen_kategori && intent.screen_kategori !== "belum"
                        ? `${intent.screen_kategori}"`
                        : "-"}
                    </td>
                    <td className={`${tableCellClass} whitespace-nowrap tabular-nums text-[12px]`}>
                      {intent.harga_produk === null
                        ? "-"
                        : intent.jenis === "produk"
                          ? formatRupiah(intent.harga_produk)
                          : formatServicePrice(intent.harga_produk)}
                    </td>
                    <td className={`${tableCellClass} max-w-[240px] text-[12px]`}>
                      {intent.addons.length === 0 ? (
                        <span className="text-[#767676]">-</span>
                      ) : (
                        <ul className="space-y-[2px]">
                          {intent.addons.map((addon, index) => (
                            <li key={index} className="tabular-nums">
                              {addon.label} — {formatServicePrice(addon.harga)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={`${tableCellClass} text-right whitespace-nowrap tabular-nums text-[13px]`}>
                      {intent.estimated_total === null ? "-" : formatRupiah(intent.estimated_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
