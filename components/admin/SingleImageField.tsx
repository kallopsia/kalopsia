"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useToast } from "./Toast";
import type { CloudinaryConfig } from "./ImageManager";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  uploadImageToCloudinary,
  validateCloudinaryUrl,
} from "./cloudinaryUpload";
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  smallDangerButtonClass,
} from "./styles";

interface SingleImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  config: CloudinaryConfig;
  label?: string;
  previewAlt?: string;
}

export default function SingleImageField({
  value,
  onChange,
  config,
  label = "Gambar (URL Cloudinary; kosong = placeholder otomatis)",
  previewAlt = "Pratinjau gambar",
}: SingleImageFieldProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const applyUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      onChange("");
      return true;
    }
    const problem = validateCloudinaryUrl(trimmed, config.cloudName);
    if (problem) {
      toast.push(problem, "error");
      return false;
    }
    onChange(trimmed);
    return true;
  };

  const handleManualAdd = () => {
    if (!manualUrl.trim()) return;
    if (applyUrl(manualUrl)) {
      setManualUrl("");
      toast.push("URL gambar dipakai.", "success");
    }
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!config.configured || !config.cloudName) {
      toast.push(
        "Cloudinary belum dikonfigurasi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + preset atau API key/secret.",
        "error"
      );
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.push(`${file.name}: format tidak didukung (jpg/png/webp/avif).`, "error");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.push(`${file.name}: ukuran maksimal 8 MB.`, "error");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file, config);
      onChange(url);
      toast.push("Gambar berhasil diunggah.", "success");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Upload gagal.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
    setManualUrl("");
    toast.push("Gambar dilepas (file di Cloudinary tetap ada).", "info");
  };

  return (
    <div>
      <div className={labelClass}>{label}</div>

      {!config.configured && (
        <div className="border border-[#D6D6D6] bg-[#F5F5F5] p-[12px] mb-[12px] text-[12px] leading-[1.5] text-[#767676]">
          Cloudinary belum dikonfigurasi di server. Set <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>{" "}
          lalu salah satu dari <code>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code> (unsigned) atau{" "}
          <code>CLOUDINARY_API_KEY</code> + <code>CLOUDINARY_API_SECRET</code> (signed). Menempel URL
          manual tetap bisa dipakai.
        </div>
      )}

      <div className="flex flex-col gap-[12px] sm:flex-row sm:items-start">
        <div className="relative w-full sm:w-[200px] aspect-[4/3] border border-[#D6D6D6] bg-[#F5F5F5]">
          {value ? (
            <Image
              src={value}
              alt={previewAlt}
              fill
              sizes="200px"
              className="object-contain p-[6px]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-[8px] text-center text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              belum ada gambar
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-[8px]">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={(event) => void handleFile(event.target.files)}
              className="text-[12px] text-[#0F0E12] file:mr-[8px] file:border file:border-[#D6D6D6] file:bg-[#FFFFFF] file:px-[12px] file:py-[8px] file:text-[11px] file:uppercase file:tracking-[0.08em] file:text-[#0F0E12]"
            />
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              {uploading ? "mengunggah..." : "jpg/png/webp/avif, maks 8 MB"}
            </span>
          </div>

          <div className="mt-[12px] flex flex-col gap-[8px] sm:flex-row">
            <input
              type="url"
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder={`https://res.cloudinary.com/${config.cloudName || "<cloud>"}/image/upload/...`}
              className={inputClass}
              aria-label="Tempel URL gambar Cloudinary"
            />
            <div className="flex gap-[8px]">
              <button type="button" onClick={handleManualAdd} className={secondaryButtonClass}>
                tempel url
              </button>
              {value && (
                <button type="button" onClick={handleRemove} className={smallDangerButtonClass}>
                  lepas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
