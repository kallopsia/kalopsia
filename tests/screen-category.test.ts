import { describe, expect, it } from "vitest";
import { detectScreenCategory } from "../lib/screen-category";

describe("detectScreenCategory — kasus positif", () => {
  const positives: [string, "14" | "15" | "16"][] = [
    ['ASUS VIVOBOOK 14"', "14"],
    ['LENOVO IDEAPAD 15"', "15"],
    ["HP PAVILION 16\"", "16"],
    ["ACER ASPIRE 14.0WUXGA I5 16GB 512GB SSD WIN11", "14"],
    ["ASUS ZENBOOK 14FHD OLED CORE ULTRA 7 155H 16GB 1TB", "14"],
    ["HP ENVY 14.0FHD+ IPS I7-1360P 16GB 1TB", "14"],
    ["ACER SWIFT GO 14 2K OLED I5-13500H 16GB 512GB", "14"],
    ["MSI PRESTIGE 14 3K I7 32GB 1TB SSD", "14"],
    ["ACER ASPIRE 7 A715-76G I5-13420H RTX3050 6GB 15.6FHD IPS 144HZ BLK", "15"],
    ["LENOVO IDEAPAD SLIM 15.6FHD RYZEN 5 7535HS 8GB 512GB", "15"],
    ["HP VICTUS 15.6 FHD IPS 144HZ I5-14450HX RTX4050 8GB", "15"],
    ["ASUS TUF GAMING F15 15.6 WQHD 165HZ I7 RTX4060", "15"],
    ["ACER NITRO V16 16WUXGA I7-14650HX RTX4060 16GB 512GB", "16"],
    ["LENOVO LOQ 16.0 2.5K IPS 165HZ I7 RTX4060 16GB", "16"],
    ["MSI KATANA 16 WQXGA 144HZ I7 RTX4070", "16"],
    ["APPLE MACBOOK AIR M3 15 INCH 8GB 256GB", "15"],
    ['DELL LATITUDE 7440 I7 LAYAR 14.0 INCH 16GB 512GB', "14"],
    ["MACBOOK PRO 14 FHD LIQUID RETINA XDR M4 PRO", "14"],
  ];

  for (const [spec, expected] of positives) {
    it(`mendeteksi ${expected}" dari "${spec}"`, () => {
      expect(detectScreenCategory(spec)).toBe(expected);
    });
  }

  it("menerima teks lowercase dan spasi berantakan", () => {
    expect(detectScreenCategory("acer swift  14.0   wuxga  i5")).toBe("14");
  });
});

describe("detectScreenCategory — kasus negatif (false positive)", () => {
  const negatives: string[] = [
    "INTEL CORE i5-14500H 32GB RAM 1TB SSD", // 14 dalam i5-14500H bukan layar
    "CORE ULTRA 7 155H 16GB LPDDR5X 512GB SSD", // 15 dalam 155H bukan layar
    "AMD RYZEN 7 7840HS 16GB 512GB SSD RADEON 780M", // 16GB bukan 16"
    "RTX 4050 6GB GDDR6 16GB DDR5 512GB SSD", // 16GB RAM, 4050 GPU
    "144HZ 165HZ 240HZ DISPLAYPORT 1.4", // refresh rate
    "512GB SSD NVME 1TB HDD 16GB DDR4", // storage/RAM
    "ACER ASPIRE A715-59G-516S I5-13420H RTX3050", // coding model
    "X1404VA X1504 1600 MAH", // coding model tanpa marker
    "TP14-31TG-128S 8GB 256GB", // kode ber-hyphen
    "IPAD PRO 11 M4 256GB WIFI", // ukuran lain di luar 14/15/16
    "MACBOOK AIR 13.3 INCH RETINA M3", // 13" bukan kategori
    "ACER SWIFT 14 SF14-71M I5-13420H 16GB 512GB W11 OHS", // "14" nama model, tanpa marker layar
    "LENOVO THINKPAD E14 WQXGA 16GB DDR5 512GB SSD", // "14" menempel huruf (E14) → aman dilewati
    "",
    "   ",
  ];

  for (const spec of negatives) {
    it(`"${spec || "(kosong)"}" → belum terkategori`, () => {
      expect(detectScreenCategory(spec)).toBe("belum");
    });
  }

  it("null/undefined → belum terkategori", () => {
    expect(detectScreenCategory(null)).toBe("belum");
    expect(detectScreenCategory(undefined)).toBe("belum");
  });
});

describe("detectScreenCategory — prioritas kandidat", () => {
  it("marker terdekat menang: VIVOBOOK 14 X1404VA 15.6FHD → 15", () => {
    expect(detectScreenCategory("ASUS VIVOBOOK 14 X1404VA 15.6FHD IPS I5 16GB 512GB")).toBe(
      "15"
    );
  });

  it("sufiks menempel (glued) menang atas marker jauh", () => {
    expect(
      detectScreenCategory("ACER PREDATOR HELIOS RTX4070 32GB 1TB SSD 16WUXGA 165HZ W11")
    ).toBe("16");
  });

  it("spesifikasi lengkap dengan prosesor + refresh rate tetap benar", () => {
    expect(
      detectScreenCategory(
        "ACER NITRO 16 AN16-41 RYZEN 7 7840HS RTX 4060 8GB 16GB DDR5 512GB 16WUXGA 165HZ W11"
      )
    ).toBe("16");
  });
});
