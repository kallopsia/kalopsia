import { describe, expect, it, vi } from "vitest";

// Membuktikan jalur admin (create/update produk) selalu menghitung ulang
// deteksi warna lalu pengelompokan varian — tidak ada simpan yang lolos.
vi.mock("../lib/supabase/service", () => {
  const row = {
    id: "p1",
    kode_barang: "A1404VAP-VIPS3852M",
    spesifikasi: "ASUS VIVOBOOK 14 A1404VAP CORE 3 100U 8GB 512GB W11+OHS+M365B 14.0FHD VIPS TERRA COTTA -VIPS3852M",
    nama_produk: null,
    notes: null,
    srp: 8299,
    stok: null,
    image_urls: [],
    is_active: true,
    is_featured: false,
  };
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "update", "insert", "order", "range", "in", "not", "or"]) {
    chain[method] = () => chain;
  }
  chain.single = async () => ({ data: row, error: null });
  chain.maybeSingle = async () => ({ data: row, error: null });
  return { getSupabaseServiceClient: () => ({ from: () => chain }) };
});

vi.mock("../lib/product-color", () => ({
  autoDetectColor: vi.fn(async () => undefined),
  setManualColor: vi.fn(async () => undefined),
  regroupProducts: vi.fn(async () => ({ changes: [] })),
}));

vi.mock("../lib/product-screen", () => ({
  autoDetectScreenCategory: vi.fn(async () => undefined),
  getScreenInfoMap: async () => new Map(),
}));

import { createProduct, updateProduct } from "../lib/admin-products";
import { autoDetectColor, regroupProducts } from "../lib/product-color";
import type { ProductInput } from "../lib/product-schema";

const input: ProductInput = {
  kode_barang: "A1404VAP-VIPS3852M",
  spesifikasi:
    "ASUS VIVOBOOK 14 A1404VAP CORE 3 100U 8GB 512GB W11+OHS+M365B 14.0FHD VIPS TERRA COTTA -VIPS3852M",
  nama_produk: "",
  notes: "",
  srp: 8299,
  stok: null,
  image_urls: [],
  is_active: true,
  is_featured: false,
};

describe("admin products — hitung ulang warna & grup saat simpan", () => {
  it("updateProduct: deteksi warna lalu regroup dipanggil dengan spesifikasi baru", async () => {
    await updateProduct("p1", input);
    expect(autoDetectColor).toHaveBeenCalledWith("p1", null, input.spesifikasi);
    expect(regroupProducts).toHaveBeenCalledWith(false);
    const detectOrder = (autoDetectColor as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const regroupOrder = (regroupProducts as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(detectOrder).toBeLessThan(regroupOrder);
  });

  it("createProduct: deteksi warna lalu regroup juga dipanggil", async () => {
    vi.mocked(autoDetectColor).mockClear();
    vi.mocked(regroupProducts).mockClear();
    await createProduct(input);
    expect(autoDetectColor).toHaveBeenCalledWith("p1", null, input.spesifikasi);
    expect(regroupProducts).toHaveBeenCalledWith(false);
  });
});
