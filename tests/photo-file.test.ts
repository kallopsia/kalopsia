import { describe, expect, it } from "vitest";
import {
  MAX_PRODUCT_PHOTOS,
  naturalCompareNames,
  photoExtension,
  photoNameOrder,
  photoPublicId,
  planFolderPhotos,
} from "../lib/photo-file";

describe("photoExtension", () => {
  it("ekstensi huruf besar dilowercase-kan", () => {
    expect(photoExtension("4.JPG")).toBe("jpg");
  });
  it("tanpa ekstensi → string kosong", () => {
    expect(photoExtension("macbook")).toBe("");
  });
});

describe("photoNameOrder — nama berawalan angka", () => {
  it("1.jpg → 1, 10.jpg → 10 (bukan 1)", () => {
    expect(photoNameOrder("1.jpg")).toBe(1);
    expect(photoNameOrder("10.jpg")).toBe(10);
  });
  it("07.png → 7", () => {
    expect(photoNameOrder("07.png")).toBe(7);
  });
  it("spasi di tepi diabaikan", () => {
    expect(photoNameOrder("  8.jpeg  ")).toBe(8);
  });
  it("bukan nama berangka → null", () => {
    expect(photoNameOrder("asus2.webp")).toBeNull();
    expect(photoNameOrder("foto depan.jpg")).toBeNull();
    expect(photoNameOrder("0.jpg")).toBeNull();
  });
});

describe("naturalCompareNames — urut abjad sadar-angka", () => {
  it("asus2 sebelum asus10", () => {
    const names = ["asus10.webp", "asus2.webp", "asus.webp"];
    expect(names.slice().sort(naturalCompareNames)).toEqual([
      "asus.webp",
      "asus2.webp",
      "asus10.webp",
    ]);
  });
  it("tidak peka huruf besar/kecil", () => {
    expect(naturalCompareNames("Mac1.png", "mac2.png")).toBeLessThan(0);
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

  it("posisi 1..n mengikuti urutan, berkas pertama jadi foto utama", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", files);
    expect(plan.photos.map((photo) => photo.index)).toEqual([1, 2, 3, 4]);
    expect(plan.photos[0].fileName).toBe("1.jpg");
  });

  it("nama bebas diterima, diurutkan setelah nama berangka", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", [
      "expert-b14.webp",
      "2.jpg",
      "1.jpg",
      "expert-b10.webp",
      "download_tes.png",
    ]);
    expect(plan.photos.map((photo) => photo.fileName)).toEqual([
      "1.jpg",
      "2.jpg",
      "download_tes.png",
      "expert-b10.webp",
      "expert-b14.webp",
    ]);
    expect(plan.photos.map((photo) => photo.index)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.skipped).toEqual([]);
  });

  it("ekstensi .avif diterima", () => {
    const plan = planFolderPhotos("PR-LAP-HP-X", ["hp-omni.avif"]);
    expect(plan.photos).toHaveLength(1);
    expect(plan.photos[0].publicId).toBe("laptop/PR-LAP-HP-X/hp-omni");
  });

  it("public_id dibangun dari nama berkas tanpa ekstensi", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", ["asus2.webp"]);
    expect(plan.photos[0].publicId).toBe("laptop/PR-LAP-AC-X/asus2");
  });

  it("hanya ekstensi non-gambar yang dilewati", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", ["1.jpg", "foto depan.jpg", "sampul.pdf", "2.heic"]);
    expect(plan.photos.map((photo) => photo.fileName)).toEqual(["1.jpg", "foto depan.jpg"]);
    expect(plan.skipped).toEqual([
      { fileName: "sampul.pdf", reason: "ekstensi" },
      { fileName: "2.heic", reason: "ekstensi" },
    ]);
  });

  it("folder kosong menghasilkan tanpa foto", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", []);
    expect(plan.photos).toEqual([]);
    expect(plan.skipped).toEqual([]);
  });

  it("public_id dari Cloudinary dipakai apa adanya", () => {
    const plan = planFolderPhotos("PR-LAP-AC-X", [
      { fileName: "copy_of_macbook_1.png", publicId: "copy_of_macbook_1" },
      { fileName: "2.jpg", publicId: "laptop/PR-LAP-AC-X/2" },
    ]);
    expect(plan.photos.map((photo) => photo.publicId)).toEqual([
      "laptop/PR-LAP-AC-X/2",
      "copy_of_macbook_1",
    ]);
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
