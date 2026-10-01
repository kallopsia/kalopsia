import { describe, expect, it } from "vitest";
import {
  MAX_PRODUCT_PHOTOS,
  parsePhotoFileName,
  photoPublicId,
  planFolderPhotos,
  sortPhotoAssets,
} from "../lib/photo-file";

describe("parsePhotoFileName — pola numerik", () => {
  it("1.jpg → indeks 1", () => {
    expect(parsePhotoFileName("1.jpg")).toEqual({ index: 1, extension: "jpg", baseName: "1" });
  });
  it("10.jpg → indeks 10 (bukan 1)", () => {
    expect(parsePhotoFileName("10.jpg")?.index).toBe(10);
  });
  it("2.png dan 3.webp diterima", () => {
    expect(parsePhotoFileName("2.png")?.extension).toBe("png");
    expect(parsePhotoFileName("3.webp")?.extension).toBe("webp");
  });
  it("07.jpg → indeks 7, baseName tetap 07", () => {
    expect(parsePhotoFileName("07.jpg")).toEqual({ index: 7, extension: "jpg", baseName: "07" });
  });
  it("ekstensi huruf besar diterima", () => {
    expect(parsePhotoFileName("4.JPG")).toEqual({ index: 4, extension: "jpg", baseName: "4" });
  });
  it("spasi di tepi diabaikan", () => {
    expect(parsePhotoFileName("  8.jpeg  ")?.index).toBe(8);
  });
  it("foto depan.jpg ditolak", () => {
    expect(parsePhotoFileName("foto depan.jpg")).toBeNull();
  });
  it("IMG_1.jpg, 1.heic, 1.jpg.png, dan 0.jpg ditolak", () => {
    expect(parsePhotoFileName("IMG_1.jpg")).toBeNull();
    expect(parsePhotoFileName("1.heic")).toBeNull();
    expect(parsePhotoFileName("1.jpg.png")).toBeNull();
    expect(parsePhotoFileName("0.jpg")).toBeNull();
  });
});

describe("sortPhotoAssets — urut numerik", () => {
  it("2 sebelum 10", () => {
    const sorted = sortPhotoAssets([
      { index: 10, fileName: "10.jpg", publicId: "a/10" },
      { index: 2, fileName: "2.jpg", publicId: "a/2" },
      { index: 1, fileName: "1.jpg", publicId: "a/1" },
    ]);
    expect(sorted.map((photo) => photo.index)).toEqual([1, 2, 10]);
  });
  it("seri indeks dipecah dengan nama berkas", () => {
    const sorted = sortPhotoAssets([
      { index: 3, fileName: "3.png", publicId: "p" },
      { index: 3, fileName: "3.jpg", publicId: "j" },
    ]);
    expect(sorted.map((photo) => photo.fileName)).toEqual(["3.jpg", "3.png"]);
  });
});

describe("photoPublicId", () => {
  it("prefix + folder + baseName, tanpa ekstensi", () => {
    expect(photoPublicId("laptop", "PR-LAP-AC-A715-59G-516S", "1")).toBe(
      "laptop/PR-LAP-AC-A715-59G-516S/1"
    );
  });
  it("slash tepi folder dibuang", () => {
    expect(photoPublicId("laptop", "/PR-LAP-AC-X/", "2")).toBe("laptop/PR-LAP-AC-X/2");
  });
});

describe("planFolderPhotos", () => {
  const files = ["10.jpg", "2.jpg", "1.jpg", "3.png"];

  it("foto terurut numerik dan public_id memakai prefix laptop", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", files, { prefix: "laptop" });
    expect(plan.photos.map((photo) => photo.fileName)).toEqual([
      "1.jpg",
      "2.jpg",
      "3.png",
      "10.jpg",
    ]);
    expect(plan.photos[0].publicId).toBe("laptop/PR-LAP-AC-X/1");
  });

  it("berkas 1 = foto utama", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", files);
    expect(plan.photos[0].index).toBe(1);
  });

  it("memisahkan file non-numerik dengan alasan", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", ["1.jpg", "foto depan.jpg", "2.bmp"]);
    expect(plan.photos.map((photo) => photo.fileName)).toEqual(["1.jpg"]);
    expect(plan.skipped).toEqual([
      { fileName: "foto depan.jpg", reason: "pola" },
      { fileName: "2.bmp", reason: "ekstensi" },
    ]);
  });

  it("folder kosong menghasilkan tanpa foto", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", []);
    expect(plan.photos).toEqual([]);
    expect(plan.skipped).toEqual([]);
  });

  it("melebihi batas foto → sisanya masuk truncated, tidak disimpan", () => {
    const many = Array.from({ length: MAX_PRODUCT_PHOTOS + 3 }, (_, i) => `${i + 1}.jpg`);
    const plan = planFolderPhotos("PR-LAP-BANYAK", many);
    expect(plan.photos).toHaveLength(MAX_PRODUCT_PHOTOS);
    expect(plan.truncated).toEqual([
      `${MAX_PRODUCT_PHOTOS + 1}.jpg`,
      `${MAX_PRODUCT_PHOTOS + 2}.jpg`,
      `${MAX_PRODUCT_PHOTOS + 3}.jpg`,
    ]);
  });
});
