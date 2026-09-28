import Link from "next/link";

interface CatalogToolbarProps {
  query: string;
  brand: string;
  brands: string[];
  total: number;
  shown: number;
  basePath?: string;
}

// Form GET biasa: tanpa JavaScript client, state dibaca dari searchParams.
export default function CatalogToolbar({
  query,
  brand,
  brands,
  total,
  shown,
  basePath = "/",
}: CatalogToolbarProps) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] md:px-[32px] pt-[24px] md:pt-[40px] pb-[16px]">
      <form
        method="get"
        action={basePath}
        className="flex flex-col gap-[8px] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-1 flex-col gap-[8px] sm:flex-row sm:items-center">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="cari kode / tipe / spesifikasi"
            aria-label="Cari produk"
            className="w-full sm:max-w-[320px] border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[13px] text-[#0F0E12] placeholder:text-[#767676] focus-visible:outline-none focus:border-[#0F0E12]"
          />
          <select
            name="brand"
            defaultValue={brand}
            aria-label="Filter brand"
            className="border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[13px] uppercase tracking-[0.08em] text-[#0F0E12] focus-visible:outline-none focus:border-[#0F0E12]"
          >
            <option value="">semua brand</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border border-[#0F0E12] bg-[#0F0E12] px-[16px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#FFFFFF] hover:bg-[#0071BB] hover:border-[#0071BB] transition-colors"
          >
            terapkan
          </button>
        </div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          {shown} dari {total} unit
        </div>
      </form>

      <div className="mt-[12px] flex flex-wrap items-center gap-x-[16px] gap-y-[4px] text-[11px] uppercase tracking-[0.08em]">
        <Link href="/shop" className="hover-underline-anim text-[#0071BB]">
          semua laptop
        </Link>
        <Link href="/katalog/gaming" className="text-[#767676] hover:text-[#0F0E12] transition-colors">
          gaming
        </Link>
        <Link
          href="/katalog/ultrabook"
          className="text-[#767676] hover:text-[#0F0E12] transition-colors"
        >
          ultrabook
        </Link>
        <Link
          href="/katalog/produktivitas"
          className="text-[#767676] hover:text-[#0F0E12] transition-colors"
        >
          produktivitas
        </Link>
      </div>
    </div>
  );
}
