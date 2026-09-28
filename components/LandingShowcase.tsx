import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";

type ShowcaseRow =
  | { kind: "trio"; items: Product[] }
  | { kind: "wide"; item: Product };

// Pola baris landing: 3 kartu, 1 kartu lebar, 3 kartu, 1 kartu lebar.
const ROW_PATTERN: ("trio" | "wide")[] = ["trio", "wide", "trio", "wide"];

function buildRows(products: Product[]): ShowcaseRow[] {
  const rows: ShowcaseRow[] = [];
  let cursor = 0;
  for (const kind of ROW_PATTERN) {
    if (cursor >= products.length) break;
    if (kind === "trio") {
      const items = products.slice(cursor, cursor + 3);
      rows.push({ kind, items });
      cursor += items.length;
    } else {
      rows.push({ kind, item: products[cursor] });
      cursor += 1;
    }
  }
  return rows;
}

interface LandingShowcaseProps {
  products: Product[];
}

export default function LandingShowcase({ products }: LandingShowcaseProps) {
  const rows = buildRows(products);

  return (
    <>
      {/* Mobile: 1 kolom, kartu hitam persegi, foto saja */}
      <div className="md:hidden flex flex-col gap-[16px] px-[16px] pt-[16px]">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="product-card group relative block overflow-hidden bg-[#0D0D0D] aspect-square"
          >
            <Image
              src={product.gambar[0]}
              alt={product.nama}
              fill
              sizes="100vw"
              className="object-contain p-[16px] transition-opacity duration-150 ease-out group-hover:opacity-85"
            />
          </Link>
        ))}
      </div>

      {/* Desktop: pola 3-1-3-1 dengan hairline antar baris/kolom */}
      <div className="hidden md:block w-full">
        {rows.map((row, rowIndex) =>
          row.kind === "trio" ? (
            <div key={`row-${rowIndex}`} className="grid grid-cols-3">
              {row.items.map((product, cellIndex) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className={[
                    "product-card group relative block overflow-hidden min-h-[480px]",
                    cellIndex > 0 ? "border-l border-[#D6D6D6]" : "",
                    rowIndex > 0 ? "border-t border-[#D6D6D6]" : "",
                  ].join(" ")}
                >
                  <Image
                    src={product.gambar[0]}
                    alt={product.nama}
                    fill
                    sizes="33vw"
                    className="object-contain p-[32px] transition-opacity duration-150 ease-out group-hover:opacity-85"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <Link
              key={`row-${rowIndex}`}
              href={`/product/${row.item.slug}`}
              className={[
                "product-card group relative block overflow-hidden w-full aspect-[21/9]",
                rowIndex > 0 ? "border-t border-[#D6D6D6]" : "",
              ].join(" ")}
            >
              <Image
                src={row.item.gambar[0]}
                alt={row.item.nama}
                fill
                sizes="100vw"
                className="object-contain p-[48px] transition-opacity duration-150 ease-out group-hover:opacity-85"
              />
            </Link>
          )
        )}
      </div>
    </>
  );
}
