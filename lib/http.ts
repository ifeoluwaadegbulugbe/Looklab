import "server-only";
import type { TryOnErrorBody, TryOnErrorCode } from "@/lib/tryon-types";

/** CSRF guard for mutating routes: the browser's Origin must be this site. Missing Origin is refused. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  for (const h of [request.headers.get("x-forwarded-host"), request.headers.get("host")]) {
    if (h) allowed.add(h.split(",")[0].trim().toLowerCase());
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host.toLowerCase());
    } catch {}
  }
  return allowed.has(originHost);
}

export function jsonError(
  httpStatus: number,
  code: TryOnErrorCode,
  message: string,
  extra: { retryAfter?: number; sessionId?: string } = {},
) {
  const body: TryOnErrorBody = { code, message, ...(extra.sessionId ? { sessionId: extra.sessionId } : {}) };
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (extra.retryAfter) headers["Retry-After"] = String(extra.retryAfter);
  return Response.json(body, { status: httpStatus, headers });
}

export function json(body: unknown, httpStatus = 200) {
  return Response.json(body, { status: httpStatus, headers: { "Cache-Control": "no-store" } });
}
