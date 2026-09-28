import { v2 as cloudinary } from "cloudinary";

export const CLOUDINARY_FOLDER = "notebook-archive";

export type CloudinaryPublicConfig = {
  cloudName: string;
  uploadPreset: string;
  signedEnabled: boolean;
  configured: boolean;
};

// Hanya nilai berprefiks NEXT_PUBLIC_ yang boleh turun ke browser.
export function getCloudinaryPublicConfig(): CloudinaryPublicConfig {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  const signedEnabled = Boolean(
    process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
  return {
    cloudName,
    uploadPreset,
    signedEnabled,
    configured: Boolean(cloudName) && (Boolean(uploadPreset) || signedEnabled),
  };
}

export type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export function createUploadSignature(folder = CLOUDINARY_FOLDER): CloudinarySignature {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary belum lengkap: butuh NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

  return { cloudName, apiKey, timestamp, signature, folder };
}
