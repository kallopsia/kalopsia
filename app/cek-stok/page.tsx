import Link from "next/link";
import PageShell from "@/components/PageShell";
import CatalogPagination from "@/components/CatalogPagination";
import CatalogEmptyState from "@/components/CatalogEmptyState";
import { getProducts, getCatalogStatus, PRODUCTS_REVALIDATE_SECONDS } from "@/lib/products";
import { formatSrp } from "@/lib/pricing";

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

const PER_PAGE = 50;

interface CekStokPageProps {
  searchParams: { q?: string; page?: string };
}

export default async function CekStokPage({ searchParams }: CekStokPageProps) {
  const products = await getProducts();
  const status = await getCatalogStatus();
  const query = (searchParams.q || "").trim().toLowerCase();

  const filtered = query
    ? products.filter((product) =>
        `${product.nama} ${product.kodeBarang} ${product.brand}`.toLowerCase().includes(query)
      )
    : products;

  const tersedia = filtered.filter((product) => product.hargaTersedia).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(searchParams.page) || 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (products.length === 0) {
    return (
      <PageShell kicker="INFO // STOK GUDANG" title="Cek Stok">
        <CatalogEmptyState status={status} />
      </PageShell>
    );
  }

  return (
    <PageShell kicker="INFO // STOK GUDANG" title="Cek Stok">
      <form method="get" action="/cek-stok" className="mb-[16px] flex flex-col gap-[8px] sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q || ""}
          placeholder="cari kode barang / tipe / brand"
          aria-label="Cari produk"
          className="w-full sm:max-w-[320px] border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[13px] text-[#0F0E12] placeholder:text-[#767676] focus-visible:outline-none focus:border-[#0F0E12]"
        />
        <button
          type="submit"
          className="border border-[#0F0E12] bg-[#0F0E12] px-[16px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#FFFFFF] hover:bg-[#0071BB] hover:border-[#0071BB] transition-colors"
        >
          cari
        </button>
      </form>

      <div className="mb-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        {tersedia} dari {filtered.length} unit punya harga aktif
      </div>

      <div className="border border-[#D6D6D6] bg-[#FFFFFF] divide-y divide-[#D6D6D6]">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-[8px] p-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <span>Unit</span>
          <span>Brand</span>
          <span>Harga</span>
          <span className="justify-self-end">Status</span>
        </div>
        {pageItems.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_auto] items-center gap-[8px] p-[16px] md:p-[12px] hover:bg-[#F5F5F5] transition-colors"
          >
            <span className="text-[13px] leading-snug text-[#0F0E12] line-clamp-2 pr-[8px]">
              {product.nama}
            </span>
            <span className="hidden md:block text-[11px] uppercase tracking-[0.08em] text-[#767676] truncate">
              {product.brand}
            </span>
            <span className="hidden md:block text-[13px] tabular-nums text-[#0F0E12] truncate">
              {formatSrp(product.srp)}
            </span>
            <span
              className={`inline-flex items-center gap-[6px] text-[11px] uppercase tracking-[0.08em] justify-self-end ${
                product.hargaTersedia ? "text-[#0071BB]" : "text-[#767676]"
              }`}
            >
              <span
                className={`w-[6px] h-[6px] ${
                  product.hargaTersedia ? "bg-[#0071BB]" : "bg-[#767676]"
                }`}
              />
              {product.hargaTersedia ? "TERSEDIA" : "TANYA HARGA"}
            </span>
          </Link>
        ))}
      </div>

      <CatalogPagination page={page} totalPages={totalPages} basePath="/cek-stok" params={{ q: query }} />

      <p className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        Data stok & harga disinkronkan dari database (Supabase) dan disegarkan otomatis.
      </p>
    </PageShell>
  );
}
