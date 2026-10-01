// Rantai penuh sheet "Pemetaan SKU" → target sinkron → rencana tulis.
// Menguji bahwa satu folder mengisi SEMUA SKU yang menunjuknya, termasuk SKU
// yang kode barangnya berbeda dari nama folder.

import { describe, expect, it } from "vitest";
import { computePhotoSyncPlan, type PhotoSyncReport, type SyncTarget } from "../lib/photo-sync";
import {
  joinMappingToProducts,
  normalizeMappingRows,
  type PhotoMappingInput,
} from "../lib/photo-mapping";
import { folderKeyOf, folderPathOf, type CloudinaryAsset } from "../lib/cloudinary-admin";

function asset(publicId: string, format = "jpg"): CloudinaryAsset {
  return {
    publicId,
    folderPath: folderPathOf(publicId),
    folderKey: folderKeyOf(publicId),
    fileName: `${publicId.split("/").pop()}.${format}`,
    format,
  };
}

type DbProduct = { id: string; kode_barang: string };

// Produk di database menyimpan kode TANPA prefix lama (PR-LAP-AP-…), sedangkan
// sheet pemetaan masih memakainya — join harus tetap cocok.
const PRODUCTS: DbProduct[] = [
  { id: "p-mdha", kode_barang: "MDHA4ID" },
  { id: "p-mdhc", kode_barang: "MDHC4ID" },
  { id: "p-mdhd", kode_barang: "MDHD4ID" },
  { id: "p-tanpa-pemetaan", kode_barang: "ZZZ9999" },
];

function targetsFrom(
  inputs: PhotoMappingInput[],
  products: DbProduct[] = PRODUCTS,
  manualPhotoCount = 0
): SyncTarget[] {
  const rows = normalizeMappingRows(inputs).rows;
  return joinMappingToProducts(rows, products).targets.map((target) => ({
    ...target,
    manualPhotoCount,
  }));
}

const SHEET_ROWS: PhotoMappingInput[] = [
  { rowNumber: 70, kode_barang: "PR-LAP-AP-MDHA4ID", folder: "PR-LAP-AP-MDHA4ID" },
  { rowNumber: 71, kode_barang: "PR-LAP-AP-MDHC4ID", folder: "PR-LAP-AP-MDHA4ID" },
  { rowNumber: 72, kode_barang: "PR-LAP-AP-MDHD4ID", folder: "PR-LAP-AP-MDHA4ID" },
];

const MDHA_ASSETS = [
  asset("laptop/PR-LAP-AP-MDHA4ID/1"),
  asset("laptop/PR-LAP-AP-MDHA4ID/2"),
  asset("laptop/PR-LAP-AP-MDHA4ID/10"),
];

function plan(targets: SyncTarget[], assets: CloudinaryAsset[]): PhotoSyncReport {
  return computePhotoSyncPlan({ prefix: "laptop", targets, assets, existing: [] });
}

describe("pemetaan sheet → rencana sinkron", () => {
  it("satu folder mengisi semua SKU yang menunjuknya", () => {
    const report = plan(targetsFrom(SHEET_ROWS), MDHA_ASSETS);

    expect(report.summary).toMatchObject({
      skusMapped: 3,
      foldersMapped: 1,
      skusFilled: 3,
      photosToWrite: 9,
    });
    expect(report.writePlans.map((item) => item.kode_barang)).toEqual([
      "MDHA4ID",
      "MDHC4ID",
      "MDHD4ID",
    ]);
    report.writePlans.forEach((item) =>
      expect(item.photos.map((photo) => photo.publicId)).toEqual([
        "laptop/PR-LAP-AP-MDHA4ID/1",
        "laptop/PR-LAP-AP-MDHA4ID/2",
        "laptop/PR-LAP-AP-MDHA4ID/10",
      ])
    );
  });

  it("SKU yang kode barangnya beda dari nama folder tetap terisi", () => {
    const report = plan(targetsFrom(SHEET_ROWS), MDHA_ASSETS);
    const saudara = report.writePlans.filter((item) => item.kode_barang !== "MDHA4ID");

    expect(saudara).toHaveLength(2);
    saudara.forEach((item) => {
      expect(item.action).toBe("fill");
      expect(item.folder).toBe("PR-LAP-AP-MDHA4ID");
      expect(item.photos).toHaveLength(3);
    });
  });

  it("folder bersarang di bawah folder brand tetap cocok", () => {
    const nested = MDHA_ASSETS.map((item) =>
      asset(item.publicId.replace("laptop/", "laptop/apple/"))
    );
    const report = plan(targetsFrom(SHEET_ROWS), nested);

    expect(report.summary.skusFilled).toBe(3);
    expect(report.writePlans[0].photos[0].publicId).toBe("laptop/apple/PR-LAP-AP-MDHA4ID/1");
  });

  it("SKU berfoto manual dilindungi, saudara satu folder tetap terisi", () => {
    const targets = targetsFrom(SHEET_ROWS).map((target) => ({
      ...target,
      manualPhotoCount: target.kode_barang === "MDHA4ID" ? 2 : 0,
    }));
    const report = plan(targets, MDHA_ASSETS);

    expect(report.summary).toMatchObject({ skusProtected: 1, skusFilled: 2 });
    const bySku = new Map(report.plans.map((item) => [item.kode_barang, item]));
    expect(bySku.get("MDHA4ID")?.action).toBe("protected");
    expect(bySku.get("MDHC4ID")?.action).toBe("fill");
    expect(bySku.get("MDHD4ID")?.action).toBe("fill");
  });

  it("produk tanpa baris pemetaan tidak ikut jadi target", () => {
    const report = plan(targetsFrom(SHEET_ROWS), MDHA_ASSETS);
    expect(report.plans.some((item) => item.productId === "p-tanpa-pemetaan")).toBe(false);
  });

  it("pemetaan dengan SKU yang tidak ada di database dilaporkan, bukan diam-diam", () => {
    const rows = normalizeMappingRows(SHEET_ROWS).rows;
    const joined = joinMappingToProducts(rows, [{ id: "p-mdha", kode_barang: "MDHA4ID" }]);

    expect(joined.targets.map((target) => target.kode_barang)).toEqual(["MDHA4ID"]);
    expect(joined.unknownSkus.map((row) => row.kode_barang)).toEqual(["MDHC4ID", "MDHD4ID"]);
  });

  it("nol aset di Cloudinary diberi peringatan, bukan laporan kosong tanpa sebab", () => {
    const report = plan(targetsFrom(SHEET_ROWS), []);

    expect(report.summary).toMatchObject({ assetsRead: 0, skusWithoutPhotos: 3 });
    expect(report.warnings.join(" ")).toContain('prefix "laptop/"');
  });

  it("aset yang tidak cocok folder pemetaan apa pun diberi peringatan", () => {
    const report = plan(targetsFrom(SHEET_ROWS), [asset("laptop/PR-LAP-XX-LAIN/1")]);

    expect(report.summary.skusToWrite).toBe(0);
    expect(report.warnings.join(" ")).toContain("tidak ada yang cocok dengan folder pemetaan");
  });
});
