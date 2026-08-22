import { apiRequest } from "@/lib/api/client";
import type { ImageKitAuthParams } from "@/types/catalog";

export const ADMIN_IMAGEKIT_AUTH_PATH = "/admin/products/uploads/imagekit-auth";
export const CUSTOMER_IMAGEKIT_AUTH_PATH = "/uploads/imagekit-auth";

export async function fetchImageKitAuth(
  authPath: string = ADMIN_IMAGEKIT_AUTH_PATH,
): Promise<ImageKitAuthParams> {
  return apiRequest<ImageKitAuthParams>({
    url: authPath,
  });
}

export interface ImageKitUploadResult {
  url: string;
}

export async function uploadToImageKit(
  params: ImageKitAuthParams,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ImageKitUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", params.publicKey);
  form.append("signature", params.signature);
  form.append("expire", String(params.expire));
  form.append("token", params.token);
  const endpoint = `${params.urlEndpoint.replace(/\/$/, "")}/api/v1/files/upload`;

  return new Promise<ImageKitUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as { url?: string };
          if (typeof body.url === "string") {
            resolve({ url: body.url });
            return;
          }
          reject(new Error("Upload succeeded but no URL was returned."));
        } catch {
          reject(new Error("Upload response could not be parsed."));
        }
      } else if (xhr.status === 401) {
        reject(new Error("Upload credentials expired. Please retry."));
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}
