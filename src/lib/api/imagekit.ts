import { apiRequest } from "@/lib/api/client";
import type { ImageKitAuthParams } from "@/types/catalog";

export const ADMIN_IMAGEKIT_AUTH_PATH = "/admin/products/uploads/imagekit-auth";
export const CUSTOMER_IMAGEKIT_AUTH_PATH = "/uploads/imagekit-auth";

export async function fetchImageKitAuth(
  authPath: string = ADMIN_IMAGEKIT_AUTH_PATH,
  options: { context?: "products" | "reviews" } = {},
): Promise<ImageKitAuthParams> {
  return apiRequest<ImageKitAuthParams>({
    url: authPath,
    params: options.context ? { context: options.context } : undefined,
  });
}

export interface ImageKitUploadResult {
  url: string;
}

// Browser-side uploads must target ImageKit's dedicated upload host, which
// serves CORS headers. The urlEndpoint (ik.imagekit.io/...) is delivery-only.
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export async function uploadToImageKit(
  params: ImageKitAuthParams,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ImageKitUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  if (params.folder) {
    form.append("folder", params.folder);
  }
  form.append("publicKey", params.publicKey);
  form.append("signature", params.signature);
  form.append("expire", String(params.expire));
  form.append("token", params.token);
  const endpoint = IMAGEKIT_UPLOAD_URL;

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
