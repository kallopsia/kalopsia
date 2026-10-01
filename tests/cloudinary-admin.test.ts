import { describe, expect, it } from "vitest";
import {
  folderKeyOf,
  folderPathOf,
  listChildFolders,
  listImageAssets,
  type FetchLike,
} from "../lib/cloudinary-admin";

const config = {
  cloudName: "kalopsia",
  apiBase: "https://api.cloudinary.com/v1_1/kalopsia",
  authHeader: "Basic dGVzdDp0ZXN0",
};

// Stub Admin API: mengembalikan halaman berurutan dan merekam URL yang diminta.
function stubFetch(pages: Record<string, unknown>[]): { fetchImpl: FetchLike; urls: string[] } {
  const urls: string[] = [];
  let index = 0;
  const fetchImpl: FetchLike = async (url) => {
    urls.push(url);
    const body = pages[Math.min(index, pages.length - 1)];
    index += 1;
    return { status: 200, ok: true, json: async () => body };
  };
  return { fetchImpl, urls };
}

describe("folderPathOf / folderKeyOf", () => {
  it("memecah public_id menjadi folder dan kunci folder", () => {
    expect(folderPathOf("laptop/PR-LAP-AC-A715/2")).toBe("laptop/PR-LAP-AC-A715");
    expect(folderKeyOf("laptop/PR-LAP-AC-A715/2")).toBe("pr-lap-ac-a715");
  });
  it("aset di akar tidak punya folder", () => {
    expect(folderPathOf("download_1_tes")).toBe("");
    expect(folderKeyOf("download_1_tes")).toBe("");
  });
});

describe("listImageAssets — pagination next_cursor", () => {
  it("mengumpulkan semua halaman lalu berhenti tanpa cursor", async () => {
    const { fetchImpl, urls } = stubFetch([
      {
        resources: [
          { public_id: "laptop/F-A/1", format: "jpg" },
          { public_id: "laptop/F-A/2", format: "png" },
        ],
        next_cursor: "CUSOR-2",
      },
      { resources: [{ public_id: "laptop/F-A/10", format: "jpg" }] },
    ]);

    const assets = await listImageAssets("laptop", { config, fetchImpl });
    expect(assets.map((asset) => asset.fileName)).toEqual(["1.jpg", "2.png", "10.jpg"]);
    expect(assets[0].folderKey).toBe("f-a");
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("prefix=laptop%2F");
    expect(urls[0]).toContain("max_results=500");
    expect(urls[1]).toContain("next_cursor=CUSOR-2");
  });

  it("satu halaman kosong → tanpa aset dan hanya satu request", async () => {
    const { fetchImpl, urls } = stubFetch([{ resources: [] }]);
    expect(await listImageAssets("laptop", { config, fetchImpl })).toEqual([]);
    expect(urls).toHaveLength(1);
  });

  it("error Cloudinary dilaporkan tanpa kredensial", async () => {
    const fetchImpl: FetchLike = async () => ({
      status: 401,
      ok: false,
      json: async () => ({ error: { message: "unknown api_key" } }),
    });
    await expect(listImageAssets("laptop", { config, fetchImpl })).rejects.toThrow(
      "Cloudinary Admin API 401: unknown api_key"
    );
  });
});

describe("listChildFolders", () => {
  it("membaca daftar folder bertingkat", async () => {
    const { fetchImpl, urls } = stubFetch([
      { folders: [{ path: "laptop/acer" }, { path: "laptop/asus" }], next_cursor: "C2" },
      { folders: [{ path: "laptop/dell" }] },
    ]);
    expect(await listChildFolders("laptop", { config, fetchImpl })).toEqual([
      "laptop/acer",
      "laptop/asus",
      "laptop/dell",
    ]);
    expect(urls[0]).toContain("/folders/laptop?max_results=500");
    expect(urls[1]).toContain("next_cursor=C2");
  });
});
