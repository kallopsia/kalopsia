import { z } from "zod";
import { cloudinaryUrlSchema } from "./product-schema";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug minimal 2 karakter")
  .max(180, "Slug terlalu panjang")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh huruf kecil, angka, dan tanda -");

// "" diperlakukan sebagai "tanpa gambar"; URL wajib dari Cloudinary.
const optionalImageSchema = z
  .string()
  .trim()
  .max(2048, "URL gambar terlalu panjang")
  .refine(
    (value) => value === "" || cloudinaryUrlSchema().safeParse(value).success,
    `URL gambar harus di https://res.cloudinary.com/... atau dikosongkan`
  );

const hargaSchema = z.coerce
  .number({ error: "Harga harus angka" })
  .int("Harga harus bilangan bulat (rupiah)")
  .min(0, "Harga tidak boleh negatif");

export const windowsInstallInputSchema = z.object({
  harga: hargaSchema,
  deskripsi: z.string().trim().max(4000, "Deskripsi terlalu panjang").nullable(),
});

export const softwareInputSchema = z.object({
  nama: z.string().trim().min(2, "Nama software wajib diisi").max(160, "Nama terlalu panjang"),
  slug: slugSchema,
  image_url: optionalImageSchema,
  harga: hargaSchema,
  spesifikasi_minimum: z
    .string()
    .trim()
    .max(4000, "Spesifikasi minimum terlalu panjang")
    .nullable(),
  is_active: z.boolean(),
});

export const sparepartInputSchema = z.object({
  nama: z.string().trim().min(2, "Nama sparepart wajib diisi").max(160, "Nama terlalu panjang"),
  slug: slugSchema,
  image_url: optionalImageSchema,
  harga: hargaSchema,
  deskripsi: z.string().trim().max(4000, "Deskripsi terlalu panjang").nullable(),
  is_active: z.boolean(),
});

export const addonUpdateSchema = z.object({
  id: z.string().min(1, "ID add-on wajib diisi"),
  harga: hargaSchema,
  harga_14: hargaSchema,
  harga_15: hargaSchema,
  harga_16: hargaSchema,
  is_active: z.boolean(),
});

export const addonsSaveSchema = z.object({
  addons: z
    .array(addonUpdateSchema)
    .min(1, "Tidak ada add-on yang dikirim")
    .max(4, "Kombinasi add-on hanya empat"),
});

export type WindowsInstallInput = z.infer<typeof windowsInstallInputSchema>;
export type SoftwareInput = z.infer<typeof softwareInputSchema>;
export type SparepartInput = z.infer<typeof sparepartInputSchema>;
export type AddonUpdate = z.infer<typeof addonUpdateSchema>;
