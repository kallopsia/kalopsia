import { describe, expect, it } from "vitest";
import {
  computePhotoSyncPlan,
  type ExistingPhoto,
  type PhotoSyncReport,
  type SyncTarget,
} from "../lib/photo-sync";
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

function target(kode_barang: string, folder: string, productId = kode_barang): SyncTarget {
  return {
    productId,
    kode_barang,
    folder,
    folderKey: folder.trim().toLowerCase(),
    manualPhotoCount: 0,
  };
}

// Simpan hasil rencana ke "database" tiruan untuk menguji jalankan kedua kali.
function materialize(report: PhotoSyncReport, previous: ExistingPhoto[] = []): ExistingPhoto[] {
  const written = new Set(report.writePlans.map((plan) => plan.productId));
  const kept = previous.filter(
    (row) => row.sumber === "manual" || !written.has(row.product_id)
  );
  report.writePlans.forEach((plan) => {
    plan.photos.forEach((photo) =>
      kept.push({
        product_id: plan.productId,
        public_id: photo.publicId,
        posisi: photo.posisi,
        sumber: "sync",
      })
    );
  });
  return kept;
}

describe("computePhotoSyncPlan — isi foto", () => {
  const assets = [
    asset("laptop/PR-LAP-AC-A715/1"),
    asset("laptop/PR-LAP-AC-A715/2"),
    asset("laptop/PR-LAP-AC-A715/10"),
  ];

  it("foto urut numerik dan file 1 jadi utama", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [target("A715-59G", "PR-LAP-AC-A715")],
      assets,
      existing: [],
    });
    expect(report.writePlans[0].photos.map((photo) => photo.posisi)).toEqual([1, 2, 10]);
    expect(report.writePlans[0].photos[0].publicId).toBe("laptop/PR-LAP-AC-A715/1");
    expect(report.summary).toMatchObject({ skusFilled: 1, photosToWrite: 3, skusToWrite: 1 });
  });

  it("satu folder mengisi semua SKU yang menunjuknya", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [
        target("A715-59G", "PR-LAP-AC-A715"),
        target("A715-59H", "PR-LAP-AC-A715"),
        target("A715-59J", "pr-lap-ac-a715 "),
      ],
      assets,
      existing: [],
    });
    expect(report.summary.skusFilled).toBe(3);
    expect(report.summary.assetsRead).toBe(3);
    expect(report.summary.foldersMapped).toBe(1);
    report.writePlans.forEach((plan) =>
      expect(plan.photos.map((photo) => photo.publicId)).toEqual([
        "laptop/PR-LAP-AC-A715/1",
        "laptop/PR-LAP-AC-A715/2",
        "laptop/PR-LAP-AC-A715/10",
      ])
    );
  });

  it("berkas tidak numerik dilaporkan dan dilewati", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [target("A715-59G", "PR-LAP-AC-A715")],
      assets: [...assets, asset("laptop/PR-LAP-AC-A715/foto depan"), asset("laptop/PR-LAP-AC-A715/sampul", "pdf")],
      existing: [],
    });
    expect(report.summary.photosToWrite).toBe(3);
    expect(report.skippedFiles.map((file) => [file.fileName, file.reason])).toEqual([
      ["foto depan.jpg", "pola"],
      ["sampul.pdf", "ekstensi"],
    ]);
  });
});

describe("computePhotoSyncPlan — idempoten", () => {
  const targets = [target("A715-59G", "PR-LAP-AC-A715"), target("AG14-72P", "PR-LAP-AC-AG14")];
  const assets = [
    asset("laptop/PR-LAP-AC-A715/1"),
    asset("laptop/PR-LAP-AC-A715/2"),
    asset("laptop/PR-LAP-AC-AG14/1"),
  ];

  it("jalankan dua kali tanpa perubahan Cloudinary → tidak ada yang ditulis", () => {
    const first = computePhotoSyncPlan({ prefix: "laptop", targets, assets, existing: [] });
    expect(first.summary.skusToWrite).toBe(2);

    const stored = materialize(first);
    expect(stored).toHaveLength(3);

    const second = computePhotoSyncPlan({ prefix: "laptop", targets, assets, existing: stored });
    expect(second.summary.skusToWrite).toBe(0);
    expect(second.summary.skusUnchanged).toBe(2);
    expect(second.writePlans).toEqual([]);
  });

  it("foto baru di folder hanya menambah baris baru, urutan lama tetap", () => {
    const first = computePhotoSyncPlan({ prefix: "laptop", targets, assets, existing: [] });
    const stored = materialize(first);

    const withNew = [...assets, asset("laptop/PR-LAP-AC-AG14/2")];
    const third = computePhotoSyncPlan({ prefix: "laptop", targets, assets: withNew, existing: stored });
    expect(third.summary.skusUnchanged).toBe(1);
    expect(third.summary.skusUpdated).toBe(1);
    const updated = third.writePlans[0];
    expect(updated.kode_barang).toBe("AG14-72P");
    expect(updated.photos.map((photo) => photo.posisi)).toEqual([1, 2]);
    expect(updated.removedPublicIds).toEqual([]);
  });

  it("foto yang hilang di Cloudinary dihapus dari rencana tulis", () => {
    const first = computePhotoSyncPlan({ prefix: "laptop", targets, assets, existing: [] });
    const stored = materialize(first);

    const fewer = assets.filter((a) => a.publicId !== "laptop/PR-LAP-AC-A715/2");
    const report = computePhotoSyncPlan({ prefix: "laptop", targets, assets: fewer, existing: stored });
    const plan = report.writePlans.find((item) => item.kode_barang === "A715-59G");
    expect(plan?.action).toBe("update");
    expect(plan?.removedPublicIds).toEqual(["laptop/PR-LAP-AC-A715/2"]);
  });
});

describe("computePhotoSyncPlan — laporan folder", () => {
  it("folder pemetaan yang kosong vs belum dibuat dibedakan", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [
        target("KOSONG", "PR-LAP-AC-KOSONG"),
        target("BELUM", "PR-LAP-AC-BELUM"),
      ],
      assets: [asset("laptop/PR-LAP-AC-KOSONG/sampul")],
      folders: ["laptop/PR-LAP-AC-KOSONG"],
      existing: [],
    });
    expect(report.summary.foldersEmpty).toBe(2);
    expect(report.summary.skusWithoutPhotos).toBe(2);
    expect(
      report.emptyFolders.map((folder) => [folder.folder, folder.existsInCloudinary])
    ).toEqual([
      ["PR-LAP-AC-BELUM", false],
      ["PR-LAP-AC-KOSONG", true],
    ]);
  });

  it("SKU yang foldernya kosong tidak menghapus baris sinkron lama", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [target("A715-59G", "PR-LAP-AC-A715")],
      assets: [],
      folders: ["laptop/PR-LAP-AC-A715"],
      existing: [
        { product_id: "A715-59G", public_id: "laptop/PR-LAP-AC-A715/1", posisi: 1, sumber: "sync" },
      ],
    });
    expect(report.summary.skusToWrite).toBe(0);
    expect(report.summary.skusStalePhotos).toBe(1);
    expect(report.stalePhotos).toEqual([
      {
        kode_barang: "A715-59G",
        folder: "PR-LAP-AC-A715",
        publicIds: ["laptop/PR-LAP-AC-A715/1"],
      },
    ]);
  });

  it("folder yatim hanya yang berisi foto; brand nonaktif dipisahkan", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [target("A715-59G", "PR-LAP-AC-A715")],
      assets: [
        asset("laptop/PR-LAP-AC-A715/1"),
        asset("laptop/acer/1"),
        asset("laptop/PR-LAP-GI-AERO/1"),
      ],
      folders: [
        "laptop/PR-LAP-AC-A715",
        "laptop/acer",
        "laptop/dell",
        "laptop/PR-LAP-GI-AERO",
      ],
      existing: [],
    });
    expect(report.orphanFolders).toEqual(["laptop/acer"]);
    expect(report.excludedFolders).toEqual(["laptop/PR-LAP-GI-AERO"]);
    expect(report.summary.foldersOrphan).toBe(1);
    expect(report.summary.foldersExcluded).toBe(1);
  });
});

describe("computePhotoSyncPlan — foto manual admin", () => {
  const assets = [asset("laptop/PR-LAP-AC-A715/1")];

  it("SKU dengan foto manual dilindungi, tidak ditulis", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      targets: [{ ...target("A715-59G", "PR-LAP-AC-A715"), manualPhotoCount: 2 }],
      assets,
      existing: [],
    });
    expect(report.summary.skusProtected).toBe(1);
    expect(report.writePlans).toEqual([]);
  });

  it("mode timpa tetap tidak menyentuh baris sumber manual", () => {
    const report = computePhotoSyncPlan({
      prefix: "laptop",
      overwrite: true,
      targets: [{ ...target("A715-59G", "PR-LAP-AC-A715"), manualPhotoCount: 2 }],
      assets,
      existing: [
        { product_id: "A715-59G", public_id: "manual/lama/1", posisi: 1, sumber: "manual" },
        { product_id: "A715-59G", public_id: "laptop/PR-LAP-AC-A715/9", posisi: 9, sumber: "sync" },
      ],
    });
    const plan = report.writePlans[0];
    expect(plan.action).toBe("update");
    // Baris manual tidak ikut dihitung untuk dihapus.
    expect(plan.removedPublicIds).toEqual(["laptop/PR-LAP-AC-A715/9"]);
  });
});
