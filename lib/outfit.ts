import "server-only";
import sharp from "sharp";

export const UPPER_CATEGORIES = ["tops", "jackets"] as const;
export const LOWER_CATEGORIES = ["trousers", "skirts"] as const;

const W = 1000;
const H = 1500;
/** Layout from the 8 Nov experiment: upper piece on top, lower piece directly below, on white. */
const MARGIN = 30;
const GAP = 20;
const UPPER_BOX = { width: 760, height: 620 };
const LOWER_MAX_W = 620;

async function fetchCatalogImage(url: string): Promise<Buffer> {
  // Only our own public catalogue bucket, never an arbitrary URL.
  const allowed = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/catalog/`;
  if (!url.startsWith(allowed)) throw new Error("outfit image not in catalogue");
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error("catalogue image fetch failed");
  return Buffer.from(await res.arrayBuffer());
}

/** Trims the photo's plain background edges (white, grey or beige) so pieces sit cleanly on white. */
async function fit(buf: Buffer, box: { width: number; height: number }) {
  const trimmed = await sharp(buf).flatten({ background: "#ffffff" }).trim({ threshold: 28 }).toBuffer()
    .catch(() => sharp(buf).flatten({ background: "#ffffff" }).toBuffer());
  return sharp(trimmed).resize({ width: box.width, height: box.height, fit: "inside" }).toBuffer({ resolveWithObject: true });
}

/**
 * Builds one flat-lay garment image from two catalogue products (upper above lower) on white.
 * Returned as a JPEG well under the provider's 4 MB limit.
 */
export async function composeOutfit(upperImageUrl: string, lowerImageUrl: string): Promise<Uint8Array> {
  const [upperRaw, lowerRaw] = await Promise.all([fetchCatalogImage(upperImageUrl), fetchCatalogImage(lowerImageUrl)]);
  const upper = await fit(upperRaw, UPPER_BOX);
  const lowerTop = MARGIN + upper.info.height + GAP;
  const lower = await fit(lowerRaw, { width: LOWER_MAX_W, height: H - lowerTop - MARGIN });
  const jpeg = await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } })
    .composite([
      { input: upper.data, left: Math.round((W - upper.info.width) / 2), top: MARGIN },
      { input: lower.data, left: Math.round((W - lower.info.width) / 2), top: lowerTop },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
  return new Uint8Array(jpeg);
}

export function outfitTitle(upper: string, lower: string) {
  const t = `Outfit: ${upper} with ${lower}`;
  return t.length <= 120 ? t : `${t.slice(0, 117)}...`;
}
