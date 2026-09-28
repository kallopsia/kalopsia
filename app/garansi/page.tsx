import PageShell from "@/components/PageShell";

const BLOCKS = [
  {
    title: "UNIT BARU",
    desc: "Garansi resmi pabrikan Indonesia sesuai merek (1–3 tahun), tercantum pada kolom CAKUPAN GARANSI di setiap halaman produk. Klaim dilakukan melalui service center resmi dengan menunjukkan invoice toko.",
  },
  {
    title: "UNIT BEKAS",
    desc: "Garansi toko 3–6 bulan (hardware replacement) sesuai tercantum di halaman produk. Mencakup kegagalan fungsi utama: motherboard, CPU, RAM, SSD, dan layar selama periode garansi.",
  },
  {
    title: "YANG TIDAK TERCAKUP",
    desc: "Kerusakan akibat cairan, benturan fisik, segel terbuka oleh pihak selain toko, serta kerusakan software akibat instalasi OS tidak resmi atau malware.",
  },
  {
    title: "CARA KLAIM",
    desc: "Chat WhatsApp dengan menyertakan nomor invoice dan nomor seri unit. Unit diinspeksi dalam 1–3 hari kerja; penggantian unit setara diberikan bila perbaikan tidak memungkinkan.",
  },
];

export default function GaransiPage() {
  return (
    <PageShell kicker="BELI // GARANSI & KLAIM" title="Garansi">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6]">
        {BLOCKS.map((block) => (
          <div key={block.title} className="bg-[#FFFFFF] p-[16px] md:p-[24px]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
              {block.title}
            </div>
            <p className="text-[14px] leading-[1.6] text-[#0F0E12]">{block.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        Cakupan garansi tiap unit tercantum pada halaman produk masing-masing.
      </p>
    </PageShell>
  );
}
