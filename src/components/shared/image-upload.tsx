"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { CloudUpload, Loader2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchImageKitAuth,
  uploadToImageKit,
  ADMIN_IMAGEKIT_AUTH_PATH,
} from "@/lib/api/imagekit";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;

type UploadStatus = "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  url?: string;
  error?: string;
}

interface ImageUploadDropzoneProps {
  onUploaded: (urls: string[]) => void;
  maxFiles?: number;
  authPath?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `img-${idCounter}`;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a JPG, PNG or WebP image.`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `"${file.name}" is larger than ${MAX_SIZE_MB}MB.`;
  }
  return null;
}

export function ImageUploadDropzone({
  onUploaded,
  maxFiles = 1,
  authPath = ADMIN_IMAGEKIT_AUTH_PATH,
  disabled = false,
  label = "Click to upload or drag and drop",
  hint,
  className,
}: ImageUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<UploadItem[]>([]);
  const abortsRef = useRef<Map<string, AbortController>>(new Map());
  const lastEmittedRef = useRef<string>("");

  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<string[]>([]);

  const updateItems = useCallback(
    (updater: (prev: UploadItem[]) => UploadItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        itemsRef.current = next;
        return next;
      });
    },
    [],
  );

  const patchItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      updateItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [updateItems],
  );

  useEffect(() => {
    const key = items
      .filter((item) => item.status === "done" && item.url)
      .map((item) => item.url as string)
      .join("\n");
    if (key !== lastEmittedRef.current) {
      lastEmittedRef.current = key;
      onUploaded(key === "" ? [] : key.split("\n"));
    }
  }, [items, onUploaded]);

  useEffect(() => {
    const aborts = abortsRef.current;
    return () => {
      aborts.forEach((abort) => abort.abort());
      aborts.clear();
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const runUpload = useCallback(
    async (item: UploadItem) => {
      const attempt = async (): Promise<{ url: string }> => {
        const auth = await fetchImageKitAuth(authPath);
        const abort = new AbortController();
        abortsRef.current.set(item.id, abort);
        try {
          return await uploadToImageKit(
            auth,
            item.file,
            (percent) => patchItem(item.id, { progress: percent }),
            abort.signal,
          );
        } finally {
          if (abortsRef.current.get(item.id) === abort) {
            abortsRef.current.delete(item.id);
          }
        }
      };

      patchItem(item.id, {
        status: "uploading",
        progress: 0,
        error: undefined,
      });
      try {
        const result = await attempt().catch(async (error: unknown) => {
          const message = error instanceof Error ? error.message : "";
          if (/expired/i.test(message)) {
            return attempt();
          }
          throw error;
        });
        patchItem(item.id, {
          status: "done",
          progress: 100,
          url: result.url,
        });
      } catch (err) {
        if (abortsRef.current.has(item.id)) {
          return;
        }
        patchItem(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    },
    [authPath, patchItem],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      if (disabled) return;
      setRejections([]);

      const taken = itemsRef.current.filter(
        (item) => item.status === "done" || item.status === "uploading",
      ).length;
      const room = Math.max(0, maxFiles - taken);
      const rejected: string[] = [];
      const accepted: File[] = [];

      for (const file of Array.from(files)) {
        const problem = validateFile(file);
        if (problem !== null) {
          rejected.push(problem);
        } else if (accepted.length < room) {
          accepted.push(file);
        }
      }
      const validCount =
        Array.from(files).filter((f) => validateFile(f) === null).length;
      if (validCount > accepted.length) {
        rejected.push(
          `Only ${maxFiles} image${maxFiles > 1 ? "s" : ""} can be added.`,
        );
      }

      if (rejected.length > 0) {
        setRejections(rejected);
      }
      if (accepted.length === 0) return;

      const created: UploadItem[] = accepted.map((file) => ({
        id: nextId(),
        name: file.name,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
        progress: 0,
      }));
      updateItems((prev) => [...prev, ...created]);
      created.forEach((item) => void runUpload(item));
    },
    [disabled, maxFiles, runUpload, updateItems],
  );

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (item && item.status === "error") {
        void runUpload(item);
      }
    },
    [runUpload],
  );

  const removeItem = useCallback(
    (id: string) => {
      const abort = abortsRef.current.get(id);
      if (abort) {
        abort.abort();
        abortsRef.current.delete(id);
      }
      const target = itemsRef.current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      updateItems((prev) => prev.filter((item) => item.id !== id));
    },
    [updateItems],
  );

  const doneCount = items.filter((item) => item.status === "done").length;
  const busy = items.some((item) => item.status === "uploading");

  const openPicker = useCallback(() => {
    if (!disabled && !busy && doneCount < maxFiles) {
      inputRef.current?.click();
    }
  }, [busy, disabled, doneCount, maxFiles]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files.length > 0) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const pickerDisabled = disabled || busy || doneCount >= maxFiles;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={pickerDisabled ? -1 : 0}
        aria-disabled={pickerDisabled}
        aria-label="Upload images"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          if (!pickerDisabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors outline-none",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40",
          pickerDisabled && "pointer-events-none opacity-60",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <CloudUpload className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            {label}
            {maxFiles > 1 ? ` (${doneCount}/${maxFiles})` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hint ?? `JPG, PNG or WebP · up to ${MAX_SIZE_MB}MB each`}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple={maxFiles > 1}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />

      {rejections.length > 0 ? (
        <ul
          role="alert"
          className="list-inside list-disc text-xs text-destructive"
        >
          {[...new Set(rejections)].map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative overflow-hidden rounded-lg border bg-background"
            >
              <img
                src={item.previewUrl}
                alt={item.name}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              {item.status !== "done" ? (
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/80 px-2 text-center",
                    item.status === "error" && "text-destructive",
                  )}
                >
                  {item.status === "uploading" ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                      <span className="text-xs font-medium tabular-nums">
                        {item.progress}%
                      </span>
                    </>
                  ) : (
                    <>
                      <p className="line-clamp-3 text-xs">{item.error}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium underline underline-offset-2 hover:bg-accent"
                        onClick={(event) => {
                          event.stopPropagation();
                          retry(item.id);
                        }}
                      >
                        <RotateCcw className="size-3" aria-hidden />
                        Retry
                      </button>
                    </>
                  )}
                </div>
              ) : null}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  removeItem(item.id);
                }}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
