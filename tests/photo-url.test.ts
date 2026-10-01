import { afterEach, describe, expect, it } from "vitest";
import { mergeProductPhotos, photoUrl, publicIdFromUrl } from "../lib/photo-url";

process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "kalopsia";

const CLOUD_PREFIX = "https://res.cloudinary.com/kalopsia/image/upload";

afterEach(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "kalopsia";
});

describe("photoUrl", () => {
  it("memakai cloud name dari env + f_auto,q_auto", () => {
    expect(photoUrl("laptop/PR-LAP-AC-X/1")).toBe(
      `${CLOUD_PREFIX}/f_auto,q_auto/laptop/PR-LAP-AC-X/1`
    );
  });

  it("transformasi bisa diganti", () => {
    expect(photoUrl("laptop/F/1", "f_auto,q_auto,w_400")).toBe(
      `${CLOUD_PREFIX}/f_auto,q_auto,w_400/laptop/F/1`
    );
  });

  it("tanpa cloud name tidak menghasilkan URL (caller pakai placeholder)", () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    expect(photoUrl("laptop/F/1")).toBe("");
  });

  it("public_id kosong → kosong", () => {
    expect(photoUrl("   ")).toBe("");
  });
});

describe("publicIdFromUrl", () => {
  it("membuang versi dan segmen transformasi", () => {
    expect(
      publicIdFromUrl(`${CLOUD_PREFIX}/v1700000000/f_auto,q_auto/laptop/PR-LAP-AC-X/2.jpg`)
    ).toBe("laptop/PR-LAP-AC-X/2");
  });

  it("URL tanpa transformasi tetap terbaca", () => {
    expect(publicIdFromUrl(`${CLOUD_PREFIX}/laptop/F/1.png`)).toBe("laptop/F/1");
  });

  it("bukan host Cloudinary → null", () => {
    expect(publicIdFromUrl("https://example.com/image/upload/a/1.jpg")).toBeNull();
    expect(publicIdFromUrl("bukan url")).toBeNull();
  });
});

describe("mergeProductPhotos", () => {
  const synced = [
    { public_id: "laptop/F/1", posisi: 1 },
    { public_id: "laptop/F/2", posisi: 2 },
  ];

  it("produk tanpa foto manual memakai hasil sinkron terurut posisi", () => {
    expect(mergeProductPhotos([], synced).map((url) => publicIdFromUrl(url))).toEqual([
      "laptop/F/1",
      "laptop/F/2",
    ]);
  });

  it("posisi 10 tidak mendahului posisi 2", () => {
    const unordered = [
      { public_id: "laptop/F/10", posisi: 10 },
      { public_id: "laptop/F/2", posisi: 2 },
    ];
    expect(mergeProductPhotos([], unordered).map((url) => publicIdFromUrl(url))).toEqual([
      "laptop/F/2",
      "laptop/F/10",
    ]);
  });

  it("foto manual tetap di depan (gambar utama tidak bergeser)", () => {
    const manual = [`${CLOUD_PREFIX}/manual/utama.jpg`];
    expect(mergeProductPhotos(manual, synced)).toEqual([
      manual[0],
      `${CLOUD_PREFIX}/f_auto,q_auto/laptop/F/1`,
      `${CLOUD_PREFIX}/f_auto,q_auto/laptop/F/2`,
    ]);
  });

  it("foto yang sama tidak ditulis dua kali", () => {
    const manual = [`${CLOUD_PREFIX}/f_auto,q_auto/laptop/F/1.jpg`];
    expect(mergeProductPhotos(manual, synced)).toEqual([
      manual[0],
      `${CLOUD_PREFIX}/f_auto,q_auto/laptop/F/2`,
    ]);
  });

  it("input kosong → kosong", () => {
    expect(mergeProductPhotos(null, undefined)).toEqual([]);
  });
});
