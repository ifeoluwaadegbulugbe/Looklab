import "server-only";
import { ClothsyError, RateLimitError } from "clothsy-ai";
import type { TryOnErrorCode } from "@/lib/tryon-types";

export interface MappedError {
  httpStatus: number;
  code: TryOnErrorCode;
  message: string;
  retryAfter?: number;
}

const GENERIC = "Something went wrong creating your try-on. Please try again.";

/** Turns any provider error into a status, a LookLab code and shopper-safe copy. Branches on code only. */
export function mapClothsyError(error: unknown): MappedError {
  if (!(error instanceof ClothsyError)) {
    return { httpStatus: 500, code: "UNKNOWN", message: GENERIC };
  }
  switch (error.code) {
    case "PERSON_PHOTO_REJECTED":
    case "IMAGE_REJECTED":
      return {
        httpStatus: 422,
        code: "PERSON_PHOTO_REJECTED",
        message:
          "We couldn't use that photo. Try a clear, well-lit photo of just you (one adult), facing the camera, ideally full length.",
      };
    case "UNSUPPORTED_IMAGE":
    case "IMAGE_TOO_LARGE":
      return { httpStatus: 400, code: "PHOTO_INVALID", message: "Please use a JPEG or PNG photo under 4 MB." };
    case "INVALID_IMAGE_ID":
      return {
        httpStatus: 409,
        code: "PHOTO_REQUIRED",
        message: "Your earlier photo has expired. Please add your photo again.",
      };
    case "GARMENT_REJECTED":
      return { httpStatus: 422, code: "GARMENT_REJECTED", message: "This item isn't available for virtual try-on." };
    case "INSUFFICIENT_CREDITS":
      return {
        httpStatus: 503,
        code: "FITTING_ROOM_FULL",
        message: "The fitting room is full right now. Have a look at some sample results instead.",
      };
    case "RATE_LIMITED":
      return {
        httpStatus: 429,
        code: "RATE_LIMITED",
        message: "Lots of people are trying things on. We'll retry in a moment.",
        retryAfter: error instanceof RateLimitError ? error.retryAfter : undefined,
      };
    case "INTERNAL_ERROR":
    case "START_FAILED":
    case "UNAVAILABLE":
      return { httpStatus: 503, code: "UNAVAILABLE", message: "Try-on is briefly unavailable. Please try again in a minute." };
    // Integration problems: never the shopper's fault, never shown raw.
    default:
      return { httpStatus: 500, code: "UNKNOWN", message: GENERIC };
  }
}

/** Safe one-line server log: code only. Never ids, URLs, keys or image data. */
export function logTryOnError(where: string, error: unknown) {
  const code = error instanceof ClothsyError ? error.code : error instanceof Error ? error.name : "unknown";
  console.error(`[tryon] ${where} failed: ${code}`);
}
