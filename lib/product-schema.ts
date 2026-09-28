import { z } from "zod";

export const CLOUDINARY_HOST = "res.cloudinary.com";

export function cloudinaryUrlSchema(): z.ZodType<string> {
  const cloudName = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
  return z
    .string()
    .trim()
    .url("URL gambar tidak valid")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.hostname === CLOUDINARY_HOST && url.protocol === "https:";
      } catch {
        return false;
      }
    }, `URL gambar harus di https://${CLOUDINARY_HOST}/...`)
    .refine((value) => {
      if (!cloudName) return true;
      return new URL(value).pathname.startsWith(`/${cloudName}/`);
    }, `URL gambar harus berada di cloud "${cloudName || "<CLOUD_NAME>"}"`);
}

export const imageUrlsSchema = z.array(cloudinaryUrlSchema()).max(12, "Maksimal 12 gambar");

export const productInputSchema = z.object({
  kode_barang: z
    .string()
    .trim()
    .min(3, "Kode barang minimal 3 karakter")
    .max(120, "Kode barang terlalu panjang")
    .regex(
      /^[A-Za-z0-9._/-]+$/,
      "Kode barang hanya boleh huruf, angka, dan tanda - _ . /"
    ),
  spesifikasi: z.string().trim().min(3, "Spesifikasi wajib diisi"),
  notes: z.string().trim().max(2000, "Notes terlalu panjang").nullable(),
  srp: z.coerce
    .number({ error: "SRP harus angka" })
    .int("SRP harus bilangan bulat (satuan ribu rupiah)")
    .min(0, "SRP tidak boleh negatif"),
  is_active: z.boolean(),
  image_urls: imageUrlsSchema,
});

export type ProductInput = z.infer<typeof productInputSchema>;

// Baris CSV untuk impor massal gambar: kode_barang,image_url
export const bulkImageLineSchema = z.object({
  kode_barang: z.string().trim().min(1, "Kode barang kosong"),
  image_url: cloudinaryUrlSchema(),
});

export function parseBulkImageCsv(text: string): {
  entries: { kode_barang: string; image_url: string }[];
  errors: { line: number; message: string }[];
} {
  const entries: { kode_barang: string; image_url: string }[] = [];
  const errors: { line: number; message: string }[] = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      const lineNumber = index + 1;
      if (!line) return;
      if (lineNumber === 1 && /kode/i.test(line) && /image|url/i.test(line)) return;

      const [kode, url] = line.split(",").map((part) => part.trim());
      const parsed = bulkImageLineSchema.safeParse({ kode_barang: kode || "", image_url: url || "" });
      if (!parsed.success) {
        errors.push({
          line: lineNumber,
          message: parsed.error.issues.map((issue) => issue.message).join("; "),
        });
        return;
      }
      entries.push(parsed.data);
    });

  return { entries, errors };
}
