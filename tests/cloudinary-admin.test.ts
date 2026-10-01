import { describe, expect, it } from "vitest";
import {
  folderKeyOf,
  folderPathOf,
  listChildFolders,
  listDescendantFolders,
  listImageAssets,
  searchExpressionForPrefix,
  type FetchLike,
} from "../lib/cloudinary-admin";

const config = {
  cloudName: "kalopsia",
  apiBase: "https://api.cloudinary.com/v1_1/kalopsia",
  authHeader: "Basic dGVzdDp0ZXN0",
};

type Recorded = { url: string; method: string; body: Record<string, unknown> };

// Stub Admin API: mengembalikan halaman berurutan dan merekam request.
function stubFetch(pages: Record<string, unknown>[]): { fetchImpl: FetchLike; calls: Recorded[] } {
  const calls: Recorded[] = [];
  let index = 0;
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({
      url,
      method: init?.method || "GET",
      body: init?.body ? (JSON.parse(init.body) as Record<string, unknown>) : {},
    });
    const body = pages[Math.min(index, pages.length - 1)];
    index += 1;
    return { status: 200, ok: true, json: async () => body };
  };
  return { fetchImpl, calls };
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

describe("searchExpressionForPrefix", () => {
  it("prefix jadi ekspresi folder rekursif", () => {
    expect(searchExpressionForPrefix("laptop")).toBe('folder:"laptop*" AND resource_type:image');
    expect(searchExpressionForPrefix("/laptop/")).toBe('folder:"laptop*" AND resource_type:image');
  });
  it("tanpa prefix → semua gambar", () => {
    expect(searchExpressionForPrefix("")).toBe("resource_type:image");
  });
});

describe("listImageAssets — Search API + pagination", () => {
  it("folder & nama berkas dibaca dari asset_folder/display_name (aset hasil pindah folder)", async () => {
    const { fetchImpl, calls } = stubFetch([
      {
        resources: [
          {
            public_id: "copy_of_macbook_1",
            asset_folder: "laptop/apple/PR-LAP-AP-MDHA4ID",
            display_name: "1",
            format: "png",
          },
          {
            public_id: "macbook_2",
            asset_folder: "laptop/apple/PR-LAP-AP-MDHA4ID",
            display_name: "2",
            format: "png",
          },
        ],
      },
    ]);

    const assets = await listImageAssets("laptop", { config, fetchImpl });

    expect(assets).toEqual([
      {
        publicId: "copy_of_macbook_1",
        folderPath: "laptop/apple/PR-LAP-AP-MDHA4ID",
        folderKey: "pr-lap-ap-mdha4id",
        fileName: "1.png",
        format: "png",
      },
      {
        publicId: "macbook_2",
        folderPath: "laptop/apple/PR-LAP-AP-MDHA4ID",
        folderKey: "pr-lap-ap-mdha4id",
        fileName: "2.png",
        format: "png",
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/resources/search");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body.expression).toBe('folder:"laptop*" AND resource_type:image');
    expect(calls[0].body.max_results).toBe(500);
  });

  it("aset yang public_id-nya memuat folder tetap terbaca", async () => {
    const { fetchImpl } = stubFetch([
      { resources: [{ public_id: "laptop/F-A/1", format: "jpg" }, { public_id: "laptop/F-A/10", format: "jpg" }] },
    ]);
    const assets = await listImageAssets("laptop", { config, fetchImpl });
    expect(assets.map((asset) => [asset.folderKey, asset.fileName])).toEqual([
      ["f-a", "1.jpg"],
      ["f-a", "10.jpg"],
    ]);
  });

  it("mengumpulkan semua halaman lalu berhenti tanpa cursor", async () => {
    const { fetchImpl, calls } = stubFetch([
      {
        resources: [{ public_id: "a", asset_folder: "laptop/F-A", display_name: "1", format: "jpg" }],
        next_cursor: "CURSOR-2",
      },
      { resources: [{ public_id: "b", asset_folder: "laptop/F-A", display_name: "2", format: "jpg" }] },
    ]);

    const assets = await listImageAssets("laptop", { config, fetchImpl });
    expect(assets.map((asset) => asset.fileName)).toEqual(["1.jpg", "2.jpg"]);
    expect(calls).toHaveLength(2);
    expect(calls[1].body.next_cursor).toBe("CURSOR-2");
  });

  it("satu halaman kosong → tanpa aset dan hanya satu request", async () => {
    const { fetchImpl, calls } = stubFetch([{ resources: [] }]);
    expect(await listImageAssets("laptop", { config, fetchImpl })).toEqual([]);
    expect(calls).toHaveLength(1);
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
    const { fetchImpl, calls } = stubFetch([
      { folders: [{ path: "laptop/acer" }, { path: "laptop/asus" }], next_cursor: "C2" },
      { folders: [{ path: "laptop/dell" }] },
    ]);
    expect(await listChildFolders("laptop", { config, fetchImpl })).toEqual([
      "laptop/acer",
      "laptop/asus",
      "laptop/dell",
    ]);
    expect(calls[0].url).toContain("/folders/laptop?max_results=500");
    expect(calls[0].method).toBe("GET");
    expect(calls[1].url).toContain("next_cursor=C2");
  });
});

describe("listDescendantFolders", () => {
  it("menelusuri dua tingkat: brand lalu folder SKU", async () => {
    const pages: Record<string, unknown>[] = [
      { folders: [{ path: "laptop/apple" }, { path: "laptop/acer" }] },
      { folders: [{ path: "laptop/apple/PR-LAP-AP-MDHA4ID" }] },
      { folders: [] },
    ];
    const { fetchImpl, calls } = stubFetch(pages);

    expect(await listDescendantFolders("laptop", { config, fetchImpl })).toEqual([
      "laptop/apple",
      "laptop/acer",
      "laptop/apple/PR-LAP-AP-MDHA4ID",
    ]);
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.cloudinary.com/v1_1/kalopsia/folders/laptop?max_results=500",
      "https://api.cloudinary.com/v1_1/kalopsia/folders/laptop%2Fapple?max_results=500",
      "https://api.cloudinary.com/v1_1/kalopsia/folders/laptop%2Facer?max_results=500",
    ]);
  });
});
