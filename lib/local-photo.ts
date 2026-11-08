"use client";

/**
 * The shopper's own photo, kept ONLY in this tab's memory (an object URL) for the before/after
 * slider. Never uploaded anywhere except the try-on itself, never written to storage.
 * A page reload clears it, which is intentional.
 */
let current: { blob: Blob; url: string } | null = null;

export function getLocalPhoto() {
  return current;
}

export function setLocalPhoto(blob: Blob, url: string) {
  if (current && current.url !== url) URL.revokeObjectURL(current.url);
  current = { blob, url };
}
