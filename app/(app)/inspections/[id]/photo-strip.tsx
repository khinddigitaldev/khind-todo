"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { compressImage } from "@/lib/iqc/compress-image";
import { deletePhoto, uploadPhoto } from "../photo-actions";

type Photo = { id: number; url: string | null };

export function PhotoStrip({ inspectionId, itemId, photos, canAdd, beforeUpload }: {
  inspectionId: number; itemId: number | null; photos: Photo[]; canAdd: boolean; beforeUpload?: () => Promise<unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function add(file: File) {
    setBusy(true);
    setError(undefined);
    try {
      await beforeUpload?.(); // make sure the NG result is saved first
      const small = await compressImage(file);
      const fd = new FormData();
      fd.set("inspectionId", String(inspectionId));
      if (itemId !== null) fd.set("itemId", String(itemId));
      fd.set("file", small);
      const r = await uploadPhoto(fd);
      if (r.error) setError(r.error);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const r = await deletePhoto(id);
    if (r.error) setError(r.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {photos.map((p) => (
        <div key={p.id} className="relative">
          {p.url ? (
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img src={p.url} alt="Inspection photo" className="h-20 w-20 rounded-lg object-cover" />
            </a>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-100 text-xs">Photo</div>
          )}
          {canAdd && (
            <button
              type="button"
              onClick={() => void remove(p.id)}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {canAdd && (
        <label className={`${buttonClass.secondary} cursor-pointer`}>
          {busy ? "Uploading…" : "Add photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void add(f);
            }}
          />
        </label>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
