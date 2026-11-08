import "server-only";

/**
 * Layered outfits: one upper piece + one lower piece. The upper is tried on first; the lower is then
 * tried on over that result (see advanceOutfit in lib/clothsy/service.ts). Two try-ons, 2 credits.
 * (A single combined image was tested on 8 Nov and dropped: the AI ignored or blended the top.)
 */
export const UPPER_CATEGORIES = ["tops", "jackets"] as const;
export const LOWER_CATEGORIES = ["trousers", "skirts"] as const;
