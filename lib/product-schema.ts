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
  is_featured: z.boolean(),
  image_urls: imageUrlsSchema,
});

export type ProductInput = z.infer<typeof productInputSchema>;
