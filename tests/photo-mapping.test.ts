import { describe, expect, it } from "vitest";
import {
  countByFolder,
  joinMappingToProducts,
  normalizeFolderName,
  normalizeMappingRows,
  skusByFolder,
  mappingKodeKey,
} from "../lib/photo-mapping";

describe("normalizeFolderName", () => {
  it("case-insensitive", () => {
    expect(normalizeFolderName("PR-LAP-AC-A715-59G-516S")).toBe(
      normalizeFolderName("pr-lap-ac-a715-59g-516s")
    );
  });
  it("spasi tepi dan spasi ganda diabaikan", () => {
    expect(normalizeFolderName("  ACER   SWIFT  ")).toBe("acer swift");
  });
  it("wrap prefix dan slash akhir diabaikan", () => {
    expect(normalizeFolderName("laptop/PR-LAP-AC-X/")).toBe("x");
    expect(normalizeFolderName("/PR-LAP-AC-X")).toBe("x");
  });
  it("prefix lama pada nama folder dibuang — ejaan lengkap dan polos satu kunci", () => {
    expect(normalizeFolderName("laptop/acer/AL14-32P-34FK")).toBe(
      normalizeFolderName("PR-LAP-AC-AL14-32P-34FK")
    );
    expect(normalizeFolderName("AL14-32P-34FK")).toBe("al14-32p-34fk");
    // Tanpa prefix PR-LAP-XX- nama folder tidak berubah.
    expect(normalizeFolderName("laptop/acer/A1404VAP-VIPS3851M")).toBe(
      "a1404vap-vips3851m"
    );
  });
  it("folder kosong tetap kosong", () => {
    expect(normalizeFolderName("   ")).toBe("");
  });
});

describe("mappingKodeKey", () => {
  it("prefix lama PR-LAP-XX- dibuang", () => {
    expect(mappingKodeKey("PR-LAP-AC-A715-59G-516S")).toBe("A715-59G-516S");
  });
  it("huruf kecil di dinormalisasi", () => {
    expect(mappingKodeKey("a715-59g-516s")).toBe("A715-59G-516S");
  });
});

describe("normalizeMappingRows", () => {
  it("KODEBARANG disimpan tanpa prefix, folder apa adanya", () => {
    const { rows, issues } = normalizeMappingRows([
      { rowNumber: 2, kode_barang: "PR-LAP-AC-A715-59G-516S", folder: "PR-LAP-AC-A715-59G-516S" },
    ]);
    expect(rows).toEqual([{ kode_barang: "A715-59G-516S", folder: "PR-LAP-AC-A715-59G-516S" }]);
    expect(issues).toEqual([]);
  });

  it("SKU dengan folder kosong dilaporkan, bukan disimpan", () => {
    const { rows, issues } = normalizeMappingRows([
      { rowNumber: 5, kode_barang: "PR-LAP-LE-X1", folder: "   " },
    ]);
    expect(rows).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0].rowNumber).toBe(5);
  });

  it("brand yang sudah tidak dijual dibuang (GIGABYTE, SPC, TECNO, ZYREX)", () => {
    const { rows, excludedCount } = normalizeMappingRows([
      { rowNumber: 2, kode_barang: "PR-LAP-GI-AERO-X", folder: "PR-LAP-GI-AERO-X" },
      { rowNumber: 3, kode_barang: "PR-LAP-SP-NOTEBOOK-Y", folder: "PR-LAP-SP-NOTEBOOK-Y" },
      { rowNumber: 4, kode_barang: "PR-LAP-TE-PALSA-Z", folder: "PR-LAP-TE-PALSA-Z" },
      { rowNumber: 5, kode_barang: "PR-LAP-ZY-ZX1-Z", folder: "PR-LAP-ZY-ZX1-Z" },
      { rowNumber: 6, kode_barang: "PR-LAP-MS-STEALTH-A", folder: "PR-LAP-MS-STEALTH-A" },
      { rowNumber: 7, kode_barang: "AERO-GIGABYTE-X", folder: "FOTO-GIGABYTE" },
    ]);
    expect(excludedCount).toBe(5);
    expect(rows.map((row) => row.kode_barang)).toEqual(["STEALTH-A"]);
  });

  it("SKU duplikat: baris terakhir menang dan dicatat", () => {
    const { rows, duplicateCount } = normalizeMappingRows([
      { rowNumber: 2, kode_barang: "PR-LAP-AC-SAME", folder: "FOLDER-LAMA" },
      { rowNumber: 3, kode_barang: "PR-LAP-AC-SAME", folder: "FOLDER-BARU" },
    ]);
    expect(duplicateCount).toBe(1);
    expect(rows).toEqual([{ kode_barang: "SAME", folder: "FOLDER-BARU" }]);
  });

  it("hasil terurut kode barang supaya stabil antar impor", () => {
    const { rows } = normalizeMappingRows([
      { rowNumber: 4, kode_barang: "PR-LAP-AC-ZZ", folder: "F-ZZ" },
      { rowNumber: 3, kode_barang: "PR-LAP-AC-AA", folder: "F-AA" },
    ]);
    expect(rows.map((row) => row.kode_barang)).toEqual(["AA", "ZZ"]);
  });
});

describe("joinMappingToProducts", () => {
  const products = [
    { id: "p1", kode_barang: "A715-59G-516S" },
    { id: "p2", kode_barang: "A715-59G-517S" },
    { id: "p3", kode_barang: "AG14-72P-56PD" },
  ];

  it("SKU di Excel yang masih ber-prefix tetap mengenali DB tanpa prefix", () => {
    const { rows } = normalizeMappingRows([
      { rowNumber: 2, kode_barang: "PR-LAP-AC-A715-59G-516S", folder: "PR-LAP-AC-A715-59G-516S" },
    ]);
    const joined = joinMappingToProducts(rows, products);
    expect(joined.targets).toHaveLength(1);
    expect(joined.targets[0].productId).toBe("p1");
    expect(joined.unknownSkus).toEqual([]);
  });

  it("pencocokan tidak peka besar/kecil huruf", () => {
    const joined = joinMappingToProducts(
      [{ kode_barang: "a715-59g-517s", folder: "PR-LAP-AC-A715-59G-517S" }],
      products
    );
    expect(joined.targets.map((target) => target.productId)).toEqual(["p2"]);
  });

  it("SKU tanpa produk di DB dilaporkan, bukan error", () => {
    const joined = joinMappingToProducts(
      [{ kode_barang: "TIDAK-ADA", folder: "FOLDER-X" }],
      products
    );
    expect(joined.targets).toEqual([]);
    expect(joined.unknownSkus).toEqual([{ kode_barang: "TIDAK-ADA", folder: "FOLDER-X" }]);
  });

  it("produk tanpa pemetaan tidak masuk target", () => {
    const joined = joinMappingToProducts(
      [{ kode_barang: "A715-59G-516S", folder: "PR-LAP-AC-A715-59G-516S" }],
      products
    );
    expect(joined.targets.map((target) => target.kode_barang)).toEqual(["A715-59G-516S"]);
  });
});

describe("satu folder untuk banyak SKU", () => {
  const rows = [
    { kode_barang: "AL14-32P-34FK", folder: "PR-LAP-AC-AL14-32P-34FK" },
    { kode_barang: "AL14-32P-35FK", folder: "PR-LAP-AC-AL14-32P-34FK" },
    { kode_barang: "AL14-32P-36FK", folder: "pr-lap-ac-al14-32p-34fk " },
    { kode_barang: "AG14-72P-56PD", folder: "PR-LAP-AC-AG14-72P-56PD" },
  ];
  const products = rows.map((row, index) => ({ id: `id${index}`, kode_barang: row.kode_barang }));
  const joined = joinMappingToProducts(rows, products);

  it("3 SKU berbagi folder yang sama meski penulisannya beda", () => {
    const grouped = skusByFolder(joined.targets);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["al14-32p-34fk"].map((target) => target.kode_barang)).toEqual([
      "AL14-32P-34FK",
      "AL14-32P-35FK",
      "AL14-32P-36FK",
    ]);
  });

  it("semua SKU yang menunjuk folder itu dapat foto yang sama", () => {
    const grouped = skusByFolder(joined.targets);
    const shared = grouped["al14-32p-34fk"];
    expect(new Set(shared.map((target) => target.folderKey))).toEqual(
      new Set(["al14-32p-34fk"])
    );
  });

  it("ejaan folder dengan dan tanpa prefix tetap satu kelompok", () => {
    const joinedMixed = joinMappingToProducts(
      [
        { kode_barang: "AL14-32P-34FK", folder: "AL14-32P-34FK" },
        { kode_barang: "AL14-32P-35FK", folder: "PR-LAP-AC-AL14-32P-34FK" },
      ],
      products
    );
    const grouped = skusByFolder(joinedMixed.targets);
    expect(grouped["al14-32p-34fk"]).toHaveLength(2);
  });

  it("daftar folder unik untuk sinkron hanya berisi folder sebenarnya", () => {
    expect(joined.folderKeys).toEqual(["ag14-72p-56pd", "al14-32p-34fk"]);
  });

  it("hitungan pemakaian folder terurut terbanyak dulu", () => {
    expect(countByFolder(joined.targets)).toEqual([
      { folderKey: "al14-32p-34fk", count: 3 },
      { folderKey: "ag14-72p-56pd", count: 1 },
    ]);
  });
});
