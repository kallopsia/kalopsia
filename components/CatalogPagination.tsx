import Link from "next/link";

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  basePath?: string;
  params?: Record<string, string>;
}

function hrefFor(basePath: string, params: Record<string, string>, page: number): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default function CatalogPagination({
  page,
  totalPages,
  basePath = "/",
  params = {},
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  const linkClass =
    "border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover:border-[#0F0E12] transition-colors";

  return (
    <nav
      aria-label="Navigasi halaman katalog"
      className="max-w-[1280px] mx-auto px-[16px] md:px-[32px] py-[24px] flex flex-wrap items-center gap-[8px]"
    >
      {page > 1 ? (
        <Link href={hrefFor(basePath, params, page - 1)} className={linkClass}>
          ← sebelumnya
        </Link>
      ) : (
        <span className={`${linkClass} pointer-events-none text-[#767676]`}>← sebelumnya</span>
      )}

      {pages.map((item) => (
        <Link
          key={item}
          href={hrefFor(basePath, params, item)}
          aria-current={item === page ? "page" : undefined}
          className={
            item === page
              ? "border border-[#0F0E12] bg-[#0F0E12] px-[12px] py-[8px] text-[11px] uppercase tracking-[0.08em] text-[#FFFFFF]"
              : linkClass
          }
        >
          {item}
        </Link>
      ))}

      {page < totalPages ? (
        <Link href={hrefFor(basePath, params, page + 1)} className={linkClass}>
          berikutnya →
        </Link>
      ) : (
        <span className={`${linkClass} pointer-events-none text-[#767676]`}>berikutnya →</span>
      )}

      <span className="ml-auto text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        halaman {page} / {totalPages}
      </span>
    </nav>
  );
}
