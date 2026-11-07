"use client";

const MAX_EDGE = 1600;
const MAX_BYTES = 4 * 1024 * 1024;

export class PhotoError extends Error {}

/**
 * Downscales to ≤1600 px and re-encodes as JPEG on a canvas. Re-encoding drops all metadata,
 * including GPS location. The photo never leaves memory except in the try-on upload.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    throw new PhotoError("Please choose a JPEG or PNG photo. (iPhone HEIC photos: share or export as JPEG first.)");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("We couldn't read that photo. Please try a different one.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Your browser couldn't prepare the photo. Please try another browser.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new PhotoError("That photo is too large. Please try a smaller one.");
}
