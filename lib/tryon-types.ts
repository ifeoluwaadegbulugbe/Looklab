// Shared between the try-on API routes and the browser. No secrets, no provider types.

/** Error codes the browser may branch on. Never provider internals. */
export type TryOnErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ORIGIN"
  | "INVALID_REQUEST"
  | "CONSENT_REQUIRED"
  | "PRODUCT_UNAVAILABLE"
  | "PHOTO_REQUIRED"
  | "PHOTO_INVALID"
  | "PERSON_PHOTO_REJECTED"
  | "GARMENT_REJECTED"
  | "TRYON_FAILED"
  | "ALREADY_RUNNING"
  | "DAILY_LIMIT"
  | "FITTING_ROOM_FULL"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "NOT_FOUND"
  | "ACCOUNT_REQUIRED"
  | "NOT_READY"
  | "EXPIRED"
  | "UNKNOWN";

export type TryOnStatus = "pending" | "success" | "failed";

export interface TryOnErrorBody {
  code: TryOnErrorCode;
  message: string;
  /** Present with ALREADY_RUNNING: the session to resume polling. */
  sessionId?: string;
}

export interface StartTryOnResponse {
  sessionId: string;
  /** When the uploaded photo stops being reusable (ISO). */
  photoExpiresAt: string;
}

export interface TryOnStatusResponse {
  status: TryOnStatus;
  resultUrl: string | null;
  /** Layered outfits only: which layer is being added (1 = top, 2 = bottom). */
  step?: number;
  code?: TryOnErrorCode;
  message?: string;
}

export const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
