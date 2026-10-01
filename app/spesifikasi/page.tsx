import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import CatalogPagination from "@/components/CatalogPagination";
import CatalogEmptyState from "@/components/CatalogEmptyState";
import { getProducts, getCatalogStatus, PRODUCTS_REVALIDATE_SECONDS } from "@/lib/products";
import { formatSrp } from "@/lib/pricing";

export const metadata: Metadata = { title: "Indeks Spesifikasi" };

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

const PER_PAGE = 50;

interface SpesifikasiPageProps {
  searchParams: { q?: string; page?: string };
}

export default async function SpesifikasiPage({ searchParams }: SpesifikasiPageProps) {
  const products = await getProducts();
  const status = await getCatalogStatus();
  const query = (searchParams.q || "").trim().toLowerCase();

  const filtered = query
    ? products.filter((product) =>
        `${product.nama} ${product.kodeBarang} ${product.spesifikasiText}`
          .toLowerCase()
          .includes(query)
      )
    : products;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(searchParams.page) || 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (products.length === 0) {
    return (
      <PageShell kicker="INFO // AUDIT TEKNIS" title="Indeks Spesifikasi">
        <CatalogEmptyState status={status} />
      </PageShell>
    );
  }

  return (
    <PageShell kicker="INFO // AUDIT TEKNIS" title="Indeks Spesifikasi">
      <form
        method="get"
        action="/spesifikasi"
        className="mb-[16px] flex flex-col gap-[8px] sm:flex-row"
      >
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="cari prosesor / ram / tipe"
          aria-label="Cari spesifikasi"
          className="w-full sm:max-w-[320px] border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[13px] text-[#0F0E12] placeholder:text-[#767676] focus-visible:outline-none focus:border-[#0F0E12]"
        />
        <button
          type="submit"
          className="border border-[#0F0E12] bg-[#0F0E12] px-[16px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#FFFFFF] hover:bg-[#0071BB] hover:border-[#0071BB] transition-colors"
        >
          cari
        </button>
      </form>

      <div className="border border-[#D6D6D6] bg-[#FFFFFF] divide-y divide-[#D6D6D6]">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-[8px] p-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <span>Unit</span>
          <span>Prosesor</span>
          <span>RAM</span>
          <span>Storage</span>
          <span>Harga</span>
        </div>
        {pageItems.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-[4px] md:gap-[8px] p-[16px] md:p-[12px] hover:bg-[#F5F5F5] transition-colors"
          >
            <span className="text-[13px] leading-snug text-[#0F0E12] line-clamp-2">
              {product.nama}
            </span>
            <span className="text-[12px] text-[#767676] md:text-[13px] md:text-[#0F0E12]">
              {product.spesifikasi.prosesor || "-"}
            </span>
            <span className="text-[12px] text-[#767676] md:text-[13px] md:text-[#0F0E12] tabular-nums">
              {(product.spesifikasi.memori || "-").replace("RAM ", "")}
            </span>
            <span className="text-[12px] text-[#767676] md:text-[13px] md:text-[#0F0E12] tabular-nums">
              {product.spesifikasi.penyimpanan || "-"}
            </span>
            <span className="text-[12px] md:text-[13px] tabular-nums text-[#0F0E12]">
              {formatSrp(product.srp)}
            </span>
          </Link>
        ))}
      </div>

      <CatalogPagination
        page={page}
        totalPages={totalPages}
        basePath="/spesifikasi"
        params={{ q: query }}
      />

      <p className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        Ringkasan diekstrak otomatis dari teks spesifikasi distributor. Detail lengkap ada di
        setiap halaman produk.
      </p>
    </PageShell>
  );
}
