import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_PER_PAGE, knownBrands, listProducts } from "@/lib/admin-products";
import { formatSrp } from "@/lib/pricing";
import { productPlaceholder } from "@/lib/placeholder";
import ProductRowActions from "@/components/admin/ProductRowActions";
import { badgeClass, cardClass, inputClass, primaryButtonClass, tableCellClass, tableHeadClass } from "@/components/admin/styles";
import type { ProductRow } from "@/types/product";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Produk — KALOPSIA TECH" };

interface ProductsPageProps {
  searchParams: {
    page?: string;
    q?: string;
    status?: string;
    brand?: string;
    noImage?: string;
    srpZero?: string;
    sort?: string;
    dir?: string;
  };
}

function buildHref(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all" && value !== "kode_barang" && value !== "asc") search.set(key, value);
  });
  const query = search.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}

function SortHeader({
  label,
  field,
  sort,
  dir,
  params,
}: {
  label: string;
  field: string;
  sort: string;
  dir: string;
  params: ProductsPageProps["searchParams"];
}) {
  const nextDir = sort === field && dir !== "desc" ? "desc" : "asc";
  const active = sort === field;
  return (
    <th className={tableHeadClass}>
      <Link
        href={buildHref({ ...params, page: undefined, sort: field, dir: nextDir })}
        className={active ? "text-[#0F0E12]" : "hover:text-[#0F0E12] transition-colors"}
      >
        {label} {active ? (dir === "desc" ? "↓" : "↑") : ""}
      </Link>
    </th>
  );
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  await requireAdmin();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const query = {
    page,
    perPage: ADMIN_PER_PAGE,
    q: searchParams.q || "",
    status: (searchParams.status as "all" | "active" | "inactive") || "all",
    brand: searchParams.brand || "",
    noImage: searchParams.noImage === "1",
    srpZero: searchParams.srpZero === "1",
    sort: searchParams.sort || "kode_barang",
    dir: (searchParams.dir === "desc" ? "desc" : "asc") as "asc" | "desc",
  };

  let rows: ProductRow[] = [];
  let count = 0;
  let totalPages = 1;
  let error = "";

  try {
    const result = await listProducts(query);
    rows = result.rows;
    count = result.count;
    totalPages = result.totalPages;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const brands = knownBrands();

  return (
    <div className="w-full">
      <div className="mb-[16px] flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            ADMIN // PRODUK
          </div>
          <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
            daftar produk
          </h1>
        </div>
        <Link href="/admin/products/new" className={primaryButtonClass}>
          tambah produk
        </Link>
      </div>

      <form
        method="get"
        action="/admin/products"
        className={`${cardClass} p-[16px] mb-[16px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]`}
      >
        <div>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            Cari
          </label>
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q || ""}
            placeholder="kode / spesifikasi / notes"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            Status
          </label>
          <select name="status" defaultValue={query.status} className={inputClass}>
            <option value="all">semua</option>
            <option value="active">aktif</option>
            <option value="inactive">nonaktif</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            Brand (segmen kode)
          </label>
          <select name="brand" defaultValue={query.brand} className={inputClass}>
            <option value="">semua brand</option>
            {brands.map((brand) => (
              <option key={brand.code} value={brand.code}>
                {brand.name} ({brand.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-[6px]">
          <label className="flex items-center gap-[8px] text-[12px] text-[#0F0E12]">
            <input type="checkbox" name="noImage" value="1" defaultChecked={query.noImage} />
            tanpa gambar
          </label>
          <label className="flex items-center gap-[8px] text-[12px] text-[#0F0E12]">
            <input type="checkbox" name="srpZero" value="1" defaultChecked={query.srpZero} />
            SRP 0 / belum ada harga
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-[12px]">
          <button
            type="submit"
            className="border border-[#0F0E12] bg-[#0F0E12] px-[16px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#FFFFFF] hover:bg-[#0071BB] hover:border-[#0071BB] transition-colors"
          >
            terapkan filter
          </button>
          <Link
            href="/admin/products"
            className="text-[11px] uppercase tracking-[0.08em] text-[#767676] hover:text-[#0F0E12] transition-colors"
          >
            reset
          </Link>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
            {count} produk ditemukan
          </span>
        </div>
      </form>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[16px] text-[12px] leading-[1.6] text-[#B00020]">
          Gagal membaca produk: {error}
        </div>
      )}

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[1040px] border-collapse">
          <thead className="border-b border-[#D6D6D6]">
            <tr>
              <th className={tableHeadClass}>Gambar</th>
              <SortHeader label="Kode barang" field="kode_barang" sort={query.sort} dir={query.dir} params={searchParams} />
              <SortHeader label="Spesifikasi" field="spesifikasi" sort={query.sort} dir={query.dir} params={searchParams} />
              <th className={tableHeadClass}>Notes</th>
              <SortHeader label="SRP" field="srp" sort={query.sort} dir={query.dir} params={searchParams} />
              <th className={tableHeadClass}>Status</th>
              <th className={`${tableHeadClass} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6D6D6]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-[16px] text-[13px] text-[#767676]">
                  Tidak ada produk yang cocok dengan filter ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const image = row.image_urls?.[0];
                return (
                  <tr key={row.id}>
                    <td className={tableCellClass}>
                      <span className="relative block w-[48px] h-[36px] border border-[#D6D6D6] bg-[#F5F5F5] overflow-hidden">
                        <Image
                          src={image || productPlaceholder(row.kode_barang)}
                          alt={row.kode_barang}
                          fill
                          sizes="48px"
                          className="object-contain"
                        />
                      </span>
                    </td>
                    <td className={`${tableCellClass} whitespace-nowrap`}>
                      <Link
                        href={`/admin/products/${row.id}`}
                        className="text-[12px] text-[#0F0E12] hover:text-[#0071BB] transition-colors break-all"
                      >
                        {row.kode_barang}
                      </Link>
                    </td>
                    <td className={`${tableCellClass} max-w-[360px]`}>
                      <span className="line-clamp-2 text-[12px] leading-snug">{row.spesifikasi}</span>
                    </td>
                    <td className={`${tableCellClass} max-w-[160px]`}>
                      <span className="line-clamp-2 text-[12px] text-[#767676]">
                        {row.notes || "-"}
                      </span>
                    </td>
                    <td className={`${tableCellClass} whitespace-nowrap tabular-nums`}>
                      {row.srp > 0 ? (
                        formatSrp(row.srp)
                      ) : (
                        <span className={badgeClass("grey")}>belum tersedia</span>
                      )}
                    </td>
                    <td className={tableCellClass}>
                      <span className={badgeClass(row.is_active ? "green" : "grey")}>
                        {row.is_active ? "aktif" : "nonaktif"}
                      </span>
                      {row.is_featured === true && (
                        <span className={`${badgeClass("blue")} ml-[6px]`}>landing</span>
                      )}
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <ProductRowActions
                        id={row.id}
                        kodeBarang={row.kode_barang}
                        isActive={row.is_active}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-[16px] flex flex-wrap items-center gap-[8px]">
          {page > 1 && (
            <Link
              href={buildHref({ ...searchParams, page: String(page - 1) })}
              className="border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover:border-[#0F0E12] transition-colors"
            >
              ← sebelumnya
            </Link>
          )}
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
            halaman {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildHref({ ...searchParams, page: String(page + 1) })}
              className="border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover:border-[#0F0E12] transition-colors"
            >
              berikutnya →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
