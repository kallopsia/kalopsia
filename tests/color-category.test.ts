import { describe, expect, it } from "vitest";
import { detectColor, specSansColor, variantGroupingKey } from "../lib/color-category";
import { canonicalColor } from "../lib/color-config";

describe("detectColor — longest match first", () => {
  it("memilih SPACE BLK, bukan BLK", () => {
    expect(detectColor("APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A")?.code).toBe("SPACE BLK");
  });
  it("memilih ROYAL BLU, bukan BLU", () => {
    expect(detectColor("LENOVO IDEAPAD ROYAL BLU")?.code).toBe("ROYAL BLU");
  });
  it("memilih DARK GRY, bukan GRY", () => {
    expect(detectColor("ACER SWIFT DARK GRY")?.code).toBe("DARK GRY");
  });
  it("memilih ROSE GOLD, bukan ROSE", () => {
    expect(detectColor("APPLE MACBOOK ROSE GOLD")?.code).toBe("ROSE GOLD");
  });
  it("memilih TITANIUM BRW, bukan BRW", () => {
    expect(detectColor("LENOVO YOGA TITANIUM BRW")?.code).toBe("TITANIUM BRW");
  });
  it("memilih COOL SLV, bukan SLV", () => {
    expect(detectColor("DELL XPS COOL SLV")?.code).toBe("COOL SLV");
  });
  it("memilih LIGHT GRY / VOLCANO GREY / URBAN GRY / LUNA GRY / EVO GREY utuh", () => {
    expect(detectColor("X LIGHT GRY")?.code).toBe("LIGHT GRY");
    expect(detectColor("X VOLCANO GREY")?.code).toBe("VOLCANO GREY");
    expect(detectColor("X URBAN GRY")?.code).toBe("URBAN GRY");
    expect(detectColor("X LUNA GRY")?.code).toBe("LUNA GRY");
    expect(detectColor("X EVO GREY")?.code).toBe("EVO GREY");
  });
});

describe("detectColor — case-insensitive & word boundary", () => {
  it("case-insensitive", () => {
    expect(detectColor("apple macbook starlight")?.code).toBe("STARLIGHT");
    expect(detectColor("Asus Zenbook IndIgO")?.code).toBe("INDIGO");
  });
  it("TIDAK match SAND di dalam SANDISK", () => {
    expect(detectColor("LENOVO 512GB SANDISK SSD")).toBeNull();
  });
  it("TIDAK match warna yang menempel pada kata lain", () => {
    expect(detectColor("TEALIGHT")).toBeNull();
    expect(detectColor("BLACKLIST")).toBeNull();
  });
  it("match SAND sebagai kata utuh", () => {
    expect(detectColor("ACER SAND")?.code).toBe("SAND");
  });
  it("null / kosong / tanpa warna → null", () => {
    expect(detectColor(null)).toBeNull();
    expect(detectColor("")).toBeNull();
    expect(detectColor("   ")).toBeNull();
    expect(detectColor("APPLE MACBOOK AIR M3 13 8GB 512GB")).toBeNull();
  });
});

describe("detectColor — alias normalization (kanonik)", () => {
  it("GRY / GRAY / GREY → GREY", () => {
    expect(detectColor("X GRY")?.canonical).toBe("GREY");
    expect(detectColor("X GRAY")?.canonical).toBe("GREY");
    expect(detectColor("X GREY")?.canonical).toBe("GREY");
  });
  it("SLV / SILVER → SILVER", () => {
    expect(detectColor("X SLV")?.canonical).toBe("SILVER");
    expect(detectColor("X SILVER")?.canonical).toBe("SILVER");
  });
  it("BLU / BLUE → BLUE; PNK / PINK → PINK; WHT / WHITE → WHITE", () => {
    expect(detectColor("X BLU")?.canonical).toBe("BLUE");
    expect(detectColor("X BLUE")?.canonical).toBe("BLUE");
    expect(detectColor("X PNK")?.canonical).toBe("PINK");
    expect(detectColor("X PINK")?.canonical).toBe("PINK");
    expect(detectColor("X WHT")?.canonical).toBe("WHITE");
    expect(detectColor("X WHITE")?.canonical).toBe("WHITE");
  });
  it("BLK → BLACK; BRW / BRN → BROWN; GLD → GOLD; TERRACOTA / TERRA COTA → TERRACOTA", () => {
    expect(detectColor("X BLK")?.canonical).toBe("BLACK");
    expect(detectColor("X BRW")?.canonical).toBe("BROWN");
    expect(detectColor("X BRN")?.canonical).toBe("BROWN");
    expect(detectColor("X GLD")?.canonical).toBe("GOLD");
    expect(detectColor("X TERRACOTA")?.canonical).toBe("TERRACOTA");
    expect(detectColor("X TERRA COTA")?.canonical).toBe("TERRACOTA");
  });
  it("multi-word greys tetap berbeda (bukan GREY)", () => {
    expect(detectColor("X DARK GRY")?.canonical).toBe("DARK GRY");
    expect(detectColor("X LIGHT GRY")?.canonical).toBe("LIGHT GRY");
    expect(detectColor("X VOLCANO GREY")?.canonical).toBe("VOLCANO GREY");
    expect(detectColor("X EVO GREY")?.canonical).toBe("EVO GREY");
    expect(detectColor("X URBAN GRY")?.canonical).toBe("URBAN GRY");
    expect(detectColor("X LUNA GRY")?.canonical).toBe("LUNA GRY");
  });
  it("canonicalColor langsung", () => {
    expect(canonicalColor("gry")).toBe("GREY");
    expect(canonicalColor("terra cota")).toBe("TERRACOTA");
    expect(canonicalColor("space blk")).toBe("SPACE BLK");
  });
});

describe("specSansColor — buang warna + sufiks SKU", () => {
  it("membuang kode warna dan sufiks varian di ujung", () => {
    const color = detectColor("APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A");
    expect(specSansColor("APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A", color)).toBe(
      "apple macbook air m3 13"
    );
  });
  it("dua varian beda warna → specSansColor identik", () => {
    const a = "APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A";
    const b = "APPLE MACBOOK AIR M3 13 STARLIGHT -MGPM3ID/A";
    expect(specSansColor(a, detectColor(a))).toBe(specSansColor(b, detectColor(b)));
  });
  it("tanpa warna → hanya sufiks dibuang, lowercase", () => {
    expect(specSansColor("APPLE MACBOOK AIR M3 13 -MGPN3ID/A", null)).toBe(
      "apple macbook air m3 13"
    );
  });
});

describe("variantGroupingKey", () => {
  it("dua varian beda warna, nama & spec sama → kunci sama", () => {
    const specA = "APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A";
    const specB = "APPLE MACBOOK AIR M3 13 STARLIGHT -MGPM3ID/A";
    const keyA = variantGroupingKey({
      name: "APPLE MACBOOK AIR M3 13 SPACE BLK",
      spec: specA,
      color: detectColor(specA),
      screenCategory: "14",
    });
    const keyB = variantGroupingKey({
      name: "APPLE MACBOOK AIR M3 13 STARLIGHT",
      spec: specB,
      color: detectColor(specB),
      screenCategory: "14",
    });
    expect(keyA).toBe(keyB);
  });
  it("kategori layar berbeda → kunci berbeda", () => {
    const spec = "APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A";
    const key14 = variantGroupingKey({
      name: "",
      spec,
      color: detectColor(spec),
      screenCategory: "14",
    });
    const key15 = variantGroupingKey({
      name: "",
      spec,
      color: detectColor(spec),
      screenCategory: "15",
    });
    expect(key14).not.toBe(key15);
  });
  it("spec berbeda → kunci berbeda", () => {
    const specA = "APPLE MACBOOK AIR M3 13 SPACE BLK -MGPN3ID/A";
    const specB = "APPLE MACBOOK PRO M3 14 SPACE BLK -MGPN3ID/A";
    const keyA = variantGroupingKey({
      name: "",
      spec: specA,
      color: detectColor(specA),
      screenCategory: "14",
    });
    const keyB = variantGroupingKey({
      name: "",
      spec: specB,
      color: detectColor(specB),
      screenCategory: "14",
    });
    expect(keyA).not.toBe(keyB);
  });
});
