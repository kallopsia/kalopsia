import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  PhotoMappingParseError,
  folderFromPhotoUrl,
  parsePhotoMappingCsv,
  parsePhotoMappingFile,
  parsePhotoMappingWorkbook,
} from "../lib/photo-mapping-parser";

function workbookOf(sheets: { name: string; rows: unknown[][] }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  });
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("parsePhotoMappingWorkbook — sheet Pemetaan SKU", () => {
  const data = workbookOf([
    {
      name: "Petunjuk",
      rows: [["DAFTAR FOLDER FOTO LAPTOP"], ["Salin kolom B persis."]],
    },
    {
      name: "Pemetaan SKU",
      rows: [
        ["KODEBARANG", "Nama Folder", "Spesifikasi", "Warna (kode)", "Layar"],
        ["PR-LAP-AC-A715-59G-516S", "PR-LAP-AC-A715-59G-516S", "ACER ASPIRE ...", "BLK", '15"'],
        ["PR-LAP-AC-AG14-72P-50C7", "PR-LAP-AC-AG14-72P-56PD", "ACER ASPIRE GO ...", "GRY", '14"'],
        [null, null, null, null, null],
      ],
    },
  ]);

  it("membaca kolom A dan B dari sheet Pemetaan SKU", () => {
    const parsed = parsePhotoMappingWorkbook(data);
    expect(parsed.sheetName).toBe("Pemetaan SKU");
    expect(parsed.inputs).toEqual([
      { rowNumber: 2, kode_barang: "PR-LAP-AC-A715-59G-516S", folder: "PR-LAP-AC-A715-59G-516S" },
      { rowNumber: 3, kode_barang: "PR-LAP-AC-AG14-72P-50C7", folder: "PR-LAP-AC-AG14-72P-56PD" },
    ]);
  });

  it("baris kosong di akhir dilewati", () => {
    const parsed = parsePhotoMappingWorkbook(data);
    expect(parsed.inputs).toHaveLength(2);
  });

  it("sheet lain yang punya KODEBARANG dipakai sebagai fallback + peringatan", () => {
    const renamed = workbookOf([
      {
        name: "Pemetaan Lama",
        rows: [
          ["KODEBARANG", "Nama Folder"],
          ["PR-LAP-LE-X1", "FOTO-LENOVO-X1"],
        ],
      },
    ]);
    const parsed = parsePhotoMappingWorkbook(renamed);
    expect(parsed.sheetName).toBe("Pemetaan Lama");
    expect(parsed.warnings.join(" ")).toContain("PEMETAAN SKU");
    expect(parsed.inputs[0].folder).toBe("FOTO-LENOVO-X1");
  });

  it("file tanpa kolom KODEBARANG → error jelas", () => {
    const wrong = workbookOf([{ name: "Daftar Folder", rows: [["No"], ["Nama Folder (salin)"]] }]);
    expect(() => parsePhotoMappingWorkbook(wrong)).toThrow(PhotoMappingParseError);
  });

  it("kolom folder boleh berisi URL foto: bagian folder saja yang diambil", () => {
    const withUrls = workbookOf([
      {
        name: "Pemetaan SKU",
        rows: [
          ["KODEBARANG", "Nama Folder"],
          ["PR-LAP-MS-X", "https://res.cloudinary.com/kalopsia/image/upload/laptop/PR-LAP-MS-X/1.jpg"],
        ],
      },
    ]);
    expect(parsePhotoMappingWorkbook(withUrls).inputs[0].folder).toBe("laptop/PR-LAP-MS-X");
  });
});

describe("folderFromPhotoUrl", () => {
  it("membuang versi dan transformasi", () => {
    expect(
      folderFromPhotoUrl(
        "https://res.cloudinary.com/k/image/upload/v1700000000/f_auto,q_auto/laptop/FOLDER-A/3.webp"
      )
    ).toBe("laptop/FOLDER-A");
  });

  it("nama folder biasa tetap utuh", () => {
    expect(folderFromPhotoUrl("PR-LAP-AC-A715-59G-516S")).toBe("PR-LAP-AC-A715-59G-516S");
  });

  it("kosong → kosong", () => {
    expect(folderFromPhotoUrl("")).toBe("");
  });
});

describe("parsePhotoMappingCsv — cadangan kodebarang,url_foto", () => {
  it("memakai URL foto apa adanya untuk SKU yang tidak ikut struktur folder", () => {
    const parsed = parsePhotoMappingCsv(
      [
        "kodebarang,url_foto",
        "PR-LAP-AC-ANEH,https://res.cloudinary.com/k/image/upload/foto/aneh/1.jpg",
        "PR-LAP-AC-BIASA,laptop/PR-LAP-AC-BIASA",
      ].join("\n")
    );
    expect(parsed.inputs).toEqual([
      { rowNumber: 2, kode_barang: "PR-LAP-AC-ANEH", folder: "foto/aneh" },
      { rowNumber: 3, kode_barang: "PR-LAP-AC-BIASA", folder: "laptop/PR-LAP-AC-BIASA" },
    ]);
  });

  it("header tidak lengkap → error", () => {
    expect(() => parsePhotoMappingCsv("kode,foto\nA,B")).toThrow(PhotoMappingParseError);
    expect(() => parsePhotoMappingCsv("   ")).toThrow(PhotoMappingParseError);
  });

  it("pemisahan titik-koma diterima", () => {
    const parsed = parsePhotoMappingCsv("kodebarang;url_foto\nPR-LAP-AC-X;fotorumah/PR-LAP-AC-X");
    expect(parsed.inputs[0].folder).toBe("fotorumah/PR-LAP-AC-X");
  });
});

describe("parsePhotoMappingFile — pilih parser dari nama berkas", () => {
  it("akhiran .csv dibaca sebagai CSV", () => {
    const csv = "kodebarang,url_foto\nPR-LAP-AC-X,FOLDER-X\n";
    const parsed = parsePhotoMappingFile(new TextEncoder().encode(csv), "pemetaan.csv");
    expect(parsed.sheetName).toBe("CSV");
    expect(parsed.inputs[0].kode_barang).toBe("PR-LAP-AC-X");
  });
});
