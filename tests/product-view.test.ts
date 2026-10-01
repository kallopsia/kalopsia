import { describe, expect, it } from "vitest";
import { toProduct } from "../lib/product-view";
import type { ProductRow } from "../types/product";

process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "kalopsia";

const CLOUD_PREFIX = "https://res.cloudinary.com/kalopsia/image/upload";

function row(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "p-1",
    kode_barang: "A1404VA-AM702W",
    spesifikasi: "ASUS Vivobook 14 A1404VA Core i5-13420H 8GB 512GB",
    notes: null,
    srp: 8500000,
    image_urls: [],
    is_active: true,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toProduct — foto", () => {
  it("tanpa foto sama sekali tetap pakai placeholder, bukan tanpa gambar", () => {
    const product = toProduct(row());
    expect(product.gambar).toHaveLength(1);
    expect(product.gambar[0]).toContain("data:");
  });

  it("foto hasil sinkron dibangun dari public_id dengan f_auto,q_auto", () => {
    const product = toProduct(row(), [
      { public_id: "laptop/PR-LAP-AS-A1404VA/1", posisi: 1 },
      { public_id: "laptop/PR-LAP-AS-A1404VA/2", posisi: 2 },
    ]);
    expect(product.gambar).toEqual([
      `${CLOUD_PREFIX}/f_auto,q_auto/laptop/PR-LAP-AS-A1404VA/1`,
      `${CLOUD_PREFIX}/f_auto,q_auto/laptop/PR-LAP-AS-A1404VA/2`,
    ]);
  });

  it("gambar kurasi admin tidak digeser oleh foto sinkron", () => {
    const manual = `${CLOUD_PREFIX}/f_auto,q_auto/laptop/manual/utama.jpg`;
    const product = toProduct(row({ image_urls: [manual] }), [
      { public_id: "laptop/PR-LAP-AS-A1404VA/1", posisi: 1 },
    ]);
    expect(product.gambar[0]).toBe(manual);
    expect(product.gambar).toHaveLength(2);
  });

  it("varian warna tanpa foto tetap lengkap datanya (swatch tidak hilang)", () => {
    const product = toProduct(
      row({ kode_barang: "A1404VA-SILVER", stok: 0, warna_kode: "SLV", group_slug: "a1404va" }),
      []
    );
    expect(product.gambar).toHaveLength(1);
    expect(product.warnaKode).toBe("SLV");
    expect(product.groupSlug).toBe("a1404va");
    expect(product.tersedia).toBe(false);
  });
});
