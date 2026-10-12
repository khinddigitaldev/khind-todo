// Runs in the browser only. Tries smaller sizes and lower JPEG quality
// until the photo fits the 200 KB limit (Supabase Free storage is small).
const SIZES = [1600, 1280, 1024, 800];
const QUALITIES = [0.8, 0.7, 0.6, 0.5];

export async function compressImage(file: File, maxBytes = 204_800): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const size of SIZES) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const q of QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
        if (blob && blob.size <= maxBytes) return new File([blob], "photo.jpg", { type: "image/jpeg" });
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Could not shrink this photo below 200 KB. Try a closer, simpler shot.");
}
