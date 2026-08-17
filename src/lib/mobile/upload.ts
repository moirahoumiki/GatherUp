"use client";

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem } from "@capacitor/filesystem";

type PickImageOptions = {
  quality?: number;
  source?: "camera" | "photos" | "prompt";
};

function dataUrlToFile(dataUrl: string, fallbackName: string) {
  const [header, base64 = ""] = dataUrl.split(",", 2);
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return new File([bytes], `${fallbackName}.${extension}`, { type: mime });
}

export async function pickCompressedImage(options: PickImageOptions = {}) {
  const quality = Math.max(40, Math.min(95, options.quality ?? 70));

  if (Capacitor.isNativePlatform()) {
    const picked = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source:
        options.source === "camera"
          ? CameraSource.Camera
          : options.source === "photos"
            ? CameraSource.Photos
            : CameraSource.Prompt,
      quality
    });

    if (!picked.path) {
      return null;
    }

    const { data } = await Filesystem.readFile({ path: picked.path });
    const mime = picked.format === "png" ? "image/png" : picked.format === "webp" ? "image/webp" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${data}`;
    return dataUrlToFile(dataUrl, `mobile-upload-${Date.now()}`);
  }

  return null;
}