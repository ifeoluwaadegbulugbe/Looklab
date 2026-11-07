# Clothsy AI: integration notes (LookLab)

Read 7 Nov 2026 from 13 official pages (all HTTP 200): /docs/api, quickstart, nextjs, sdk, images,
endpoints/create-try-on, get-try-on, create-try-on-sync, errors, ai-label, custom-store, /privacy, /tos.
Not yet read: endpoints/upload-image, endpoints/account, examples, /pricing.
Confirm every SDK name below against node_modules/clothsy-ai types after install.

## Confirmed: matches the blueprint
- Base URL `https://api.clothsyai.fabricvton.com/api/v1`, `Authorization: Bearer clothsy_live_...`, one key per account, server only.
- Errors are `{ error, code }`. Branch on `code`.
- JPEG/PNG, max 4 MB. Upload id lasts 24 h and only the uploading account can use it. Uploads are free.
- Image URL rules: HTTPS, default port, HTTP 200, no redirects, fetched within 12 s.
- 1 credit per finished try-on. Failures are refunded. 20 free credits, given once. Email contact@fabricvton.com to buy more.
- `consent: true` is required (403 CONSENT_REQUIRED). The Idempotency-Key is required on create (8–128 chars, `[A-Za-z0-9_-]`).
- Result URL lasts 24 h. The result is JPEG or PNG; the AI-label page also mentions WebP.
- Next.js: `export const maxDuration = 60` on `app/api/tryon/route.ts`.

## REST shapes (the SDK maps onto these)
- `POST /images` → 201 `{ id: "img_…", expiresAt }`. Ids are opaque, up to 600 chars, so use a `text` column.
- `POST /tryons` → 202 `{ id, status: "pending", pollUrl }`.
  Body: `personImageUrl | personImageId`, `garmentImageUrl | garmentImageId`, `title?` (≤120), `consent: true`.
- `POST /tryons/sync` → 200 when finished, or 202 after about 45 s. The intro page says about 55 s. Clients should time out at 70 s or later.
- `GET /tryons/{id}` → 200 `{ id, status: pending|success|failed, resultUrl|null, message? }`. A failed try-on still returns 200.

## SDK (`clothsy-ai`)
- `new Clothsy({ apiKey?, baseUrl?, timeoutMs=60000, maxRetries=2, fetch?, dangerouslyAllowBrowser=false })`
- `images.upload(data, { filename, contentType })` → `{ id, expiresAt }`
- `tryons.create({ person, garment, title?, consent: true, idempotencyKey? })`
- `tryons.retrieve(id)` returns failed try-ons rather than throwing them.
- `tryons.waitFor(id, { timeoutMs=180000, intervalMs=2500, signal, onStatus })` and `tryons.run(params, waitOpts)`
- `account.credits()` → number
- Exports: `Clothsy, ClothsyError, InsufficientCreditsError, RateLimitError, TryOnFailedError, TryOnTimeoutError, ValidationError, friendlyMessage`. The docs also mention AuthenticationError, ServerError and ConnectionError; check these after install.
- `clothsy-ai/next`: `createTryOnRoute({ resolveProduct })`. POST takes multipart (photo, productId, consent, requestId) and returns `{ id }`. GET `?id=` returns `{status,resultUrl,message}`.
- `clothsy-ai/react`: `TryOnButton` props are `productId, endpoint, label, className`. `useTryOn({endpoint})` returns `{ start(file, productId), state, resultUrl, error, reset }`. There is **no consent checkbox**; we must add one.
- The SDK retries 429/500/502/503 and network errors (1/2/4 s) and honours Retry-After.

### Verified against installed `clothsy-ai@0.1.1` types
- All the error classes above exist and are exported, including AuthenticationError, ServerError and ConnectionError. `DEFAULT_BASE_URL` and `MAX_IMAGE_BYTES` are exported too.
- `ClothsyError` has `.code` and `.status?`. `RateLimitError.retryAfter?` is in seconds. `TryOnFailedError`/`TryOnTimeoutError` have `.tryOnId`.
- `ValidationError` also covers client-side checks that fail before any request is sent (`code: "INVALID_REQUEST"`).
- `UploadOptions.contentType` accepts only `"image/jpeg" | "image/png"`. `upload` accepts `Blob | ArrayBuffer | Uint8Array`.
- `consent` is typed as the literal `true`.
- `tryons.run` always allows at least 90 s. `createTryOnRoute` trims titles longer than 120 chars, and `resolveProduct(productId, request)` returns `null` to refuse.
- `TryOnButton` also takes `style` and `capture`. `TryOnState` = idle | preparing | uploading | processing | success | error.

## Limits
- Starts: 12/min per account. This limit is shared between /tryons and /tryons/sync.
- Polling: 30/min per try-on. Per account, the errors page says **600/min** but get-try-on says **60/min**. Use the stricter figure. At 2.5 s polling that is about 24/min per job, so only 2 or 3 jobs can poll at once across the whole app. Our one-pending-job-per-user guard plus a 2.5 s interval is fine for demo scale.
- Uploads: 30/min.
- Retry 429/5xx with the same key. Don't retry 400/401/402/403/413/422 unchanged.

## Open questions resolved
**(a) AI label.** Every result file has invisible XMP metadata that can't be switched off. There is no visible watermark option, so the visible label is our job. Recommended: a caption next to every image, e.g. "AI-generated try-on — the real fit may differ.", plus alt text that says "AI-generated preview of you wearing <title>". **If we store a result, store the bytes exactly as downloaded.** Re-encoding the image would strip the label. Keep the original content type and extension (.jpg/.png); don't force .jpg.

**(b) Storing results.** The Terms and Privacy pages are written for the Shopify/WooCommerce app and **don't mention the API at all**. Output ownership is not stated. The API docs, however, explicitly say: "copy the image to your own storage if you need it for longer" (get-try-on), and quickstart says the same. → Save-to-storage is supported by the docs. Terms are silent, so this is a decision for Ife (see report).

**(c) Repeat retrieve.** Not stated whether repeated GETs return the same resultUrl, or how long a job stays retrievable. → Store `result_url` + `result_expires_at` on the first success. Test with one re-retrieve (no credit cost) during Day 1.

**(d) Garment types.** Not stated. The docs say "One garment per image works best." → The Day 1 test matrix still decides this.

**(e) Deletion and retention.** There is no delete endpoint. Uploads are "deleted automatically, at the latest 35 days after upload". → The privacy page says "up to 35 days" and that we can't delete provider copies sooner. Note: the merchant Privacy page talks about a 24 h viewing window, which conflicts. Use the API docs' 35 days as the upper bound.

**(g) Catalogue images.** A normal product photo on a CDN is fine if it meets the URL rules. Nothing is stated about background or flat-lay vs on-model. The person photo should be a clear, full-length photo of one adult facing the camera, at about 1600 px.

**(h) Credits.** No sandbox or test keys. Buy more by email.

## Day 1 test matrix results (7 Nov 2026)
One person photo (full-length, one adult, outdoors, 960×1280 JPEG). Garments were sent as uploaded image ids.
Credits went from 20 to 16: 4 successes charged, 2 failures refunded automatically.

| Garment | Result | Time | Quality |
|---|---|---|---|
| Top (pinstripe off-shoulder) | success | 21 s | Excellent. Neckline, buttons and pinstripe accurate. The lower half of the original dress is kept and reads as a skirt. |
| Dress (draped mini, gold buckle) | **failed** | 23 s | "did not pass safety screening". Refunded. |
| Jacket (cropped leather bomber) | success | 22 s | Excellent. Layered over the existing outfit; sleeves and colour faithful. |
| Trousers (wide-leg jeans) | success | 20 s | Very good. The upper half of the dress is turned into a fitted top. |
| Skirt (black faux-leather mini) | success | 17 s | Good, but the model turned the dress top into a **crop top showing the midriff**. It invents skin when it removes the dress. |
| Shoes (mule heels) | **failed** | 17 s | "product didn't show up on your photo… may not show the item being worn". Refunded. |

Findings:
- **(c) answered:** a later `retrieve()` returns `status: success` again, but with a **different `resultUrl` each time** (signed URLs). → Re-fetching a URL for the Fitting Room is free. Always use the newest URL. Never treat a URL as an identifier.
- Results are `image/jpeg`, about 250–270 KB, at the same size as the person photo (960×1280).
- Latency is 17–23 s, consistent with "under 30 seconds".
- **(d) answered:** tops, jackets, trousers and skirts work. Shoes don't (flat product photos aren't detected). Dresses are unproven: one failed safety screening. Test one more dress (1 credit) before deciding. Short or bodycon cuts may trigger the screening.
- UX: lower-body garments replace the bottom of a dress and invent a top half. Photo guidance should say "works best if you're wearing a fitted top and trousers/skirt".
- Catalogue decision: tops, jackets/coats, trousers/jeans, skirts. Dresses are on hold pending a retest. No shoes, bags or accessories.

### Dress retest (7 Nov 2026)
| Garment | Result | Time | Notes |
|---|---|---|---|
| Dress 2 (apricot strapless chiffon maxi, thigh slit) | **failed** | 22 s | "did not pass safety screening" again. Refunded. Credits still 16. |

- Both dresses failed safety screening, while separates (top, jacket, jeans, skirt) all passed.
- Both dresses would show a lot of generated skin: a mini length, then a strapless top with a thigh slit. Working hypothesis: the screening trips on skin the model has to invent, not on dresses as such. Unproven.
- Failures cost nothing (refunded), so another dress test only costs a credit if it succeeds.
- Decision for now: **no dresses in the catalogue.** If time allows, test one modest dress (sleeves, knee length or longer, no slit). Add dresses back only if it passes.
