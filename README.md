# LookLab

**Discover it. Try it. Make it yours.**

LookLab is a fashion discovery app where every piece has a *Try it on* button. You upload one photo, tick an 18+ consent box, and about 20 seconds later you see an AI-generated preview of yourself wearing it. Your photo stays ready in your **Fitting Room**, so the next piece is one tap. You can compare looks side by side, build a two-piece outfit, and save the ones you love.

Built for **HackTheFashion Global '26** (Try-On Commerce track) on the official [Clothsy AI](https://clothsyai.fabricvton.com/docs/api) virtual try-on API.

**Live:** https://looklab-tau.vercel.app

---

## What you can do

| Feature | Details |
|---|---|
| Discover | Editorial home feed, 8 aesthetics, 6 collections, category browsing, search and filters. "For you" ordering from a 2-step, skippable onboarding (a transparent tag-overlap score, no AI). |
| Try it on | Real Clothsy try-on from any product page or card. Every time: client-side resize to 1600 px JPEG (strips EXIF/GPS), unticked 18+ consent box, scanning animation, result with an "AI-generated try-on" label. |
| Fitting Room | Your try-ons from the last 24 hours. Your uploaded photo is reused for 24 hours, so the next piece is one tap. |
| Build an outfit | Pick a top or jacket plus trousers or a skirt. Layered try-on: the top goes on first, then the bottom is added over that result. Two try-ons. |
| Compare | Side by side, a reveal slider, and before/after against your own photo. Your photo is held in browser memory only, never stored. |
| Save looks | Copies a finished result into private storage so it outlives the provider's 24-hour link. Guests add an email (their guest account is upgraded in place, so the Fitting Room comes along). |
| Your data | Delete a look, or delete everything LookLab holds about you, in one tap. A plain-language Privacy & AI page. |

## Tech stack

- **Next.js 16** (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS v4
- **Supabase**: Auth (anonymous plus email link), Postgres with row-level security, Storage (public `catalog`, private `saved-looks`)
- **Clothsy AI** via the official `clothsy-ai` SDK, **server only**
- **Vercel** hosting

## Architecture

```
Browser ──► Next.js route handlers (server) ──► Clothsy AI API
   │                 │
   │                 └──► Supabase (Postgres + Storage, service role)
   └──► Supabase (anon/publishable key, RLS: own rows only)
```

- The browser **never** calls Clothsy and never sees the API key. Only `lib/clothsy/` imports the SDK.
- The **garment image and title always come from the database by product id**, never from the browser.
- A pending session row is claimed **before** the provider call. A unique index allows one pending try-on per user, and the click's request id is the provider idempotency key, so double clicks and retries cost at most one credit.
- The browser polls `GET /api/tryon?id=<LookLab session id>`, so the provider's job id never appears in URLs or logs. Rate limits are honoured (`Retry-After`).
- **Credit protection:** a kill switch (`TRYON_ENABLED`), a per-user rolling 24-hour cap, and a global cap. Outfits count as 2. When a cap is hit, shoppers see a friendly "Fitting Room is full" screen.
- **Saved looks** are stored byte-for-byte as downloaded, so the provider's embedded AI label (XMP) survives. Files go to `saved-looks/{user_id}/{look_id}.jpg`, and storage policy lets users read only their own folder.

```
app/            pages + route handlers (api/tryon, api/looks, api/me/delete, auth/callback)
components/     UI (try-on sheet, fitting room, compare, outfit builder, saved, nav…)
lib/clothsy/    the ONLY place that imports clothsy-ai (client, errors, service)
lib/supabase/   browser, server (cookies) and admin (service role, server-only) clients
lib/            catalog, quota, looks, outfit, http helpers, shared types
supabase/       migrations (paste into the SQL Editor in order) and catalogue seed data
scripts/        setup, seeding and test scripts (see Testing)
docs/           clothsy-notes.md: verified API facts, test matrix and decisions
```

## Running locally

Requirements: Node 18+ (developed on Node 24), a Supabase project, and a Clothsy AI API key.

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev                  # http://localhost:3000
```

Database setup: in the Supabase **SQL Editor**, run the files in `supabase/migrations/` in name order. Then:

```bash
node --env-file=.env.local scripts/supabase-setup.mjs   # buckets
node --env-file=.env.local scripts/seed-catalog.mjs     # catalogue (images from private/catalog/)
```

In Supabase **Authentication**, enable **Anonymous sign-ins** and **Confirm email**, and add `http://localhost:3000/**` plus your production URL under Redirect URLs.

### Environment variables

| Name | Where | Purpose |
|---|---|---|
| `CLOTHSY_API_KEY` | server only | Clothsy key (`clothsy_live_…`). Never `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | server only | Admin writes (sessions, saved looks, deletion) |
| `NEXT_PUBLIC_SITE_URL` | public | Production URL (auth links, origin checks) |
| `TRYON_ENABLED` | server only | `false` pauses all try-ons |
| `TRYON_USER_DAILY_CAP` | server only | Try-ons per user per rolling 24 hours (default 3) |
| `TRYON_GLOBAL_CAP` | server only | All-time cap across the app; keep it below your remaining credits |

## Testing

No test spends credits unless it is run with `--yes`.

| Script | What it checks |
|---|---|
| `scripts/rls-test.mjs` | Two-user row-level security for every table and storage path (38 checks) |
| `scripts/route-test.mjs` | Every refusal path of `/api/tryon`: origin, auth, consent, validation, one-at-a-time, caps (18 checks) |
| `scripts/looks-test.mjs` | Save/delete looks, guest refusal, ownership, byte-identical storage (15 checks) |
| `scripts/delete-test.mjs` | Delete my data removes every row and file, and leaves other users untouched (12 checks) |
| `scripts/outfit-test.mjs` | Layered outfit validation, step transitions, partial results and quota cost (11 checks) |
| `scripts/tryon-test.mjs` | The Day 1 garment test matrix against the real API (spends credits; dry run by default) |

Run them against the dev server with `node --env-file=.env.local scripts/<name>.mjs`.

## Privacy and responsible AI

- **Adults only.** An unticked consent checkbox is shown every time before anything is uploaded.
- LookLab **never stores your photo**. It is resized in the browser and streamed to Clothsy from memory.
- Clothsy keeps uploaded photos for **up to 35 days**, then deletes them. We can't delete their copy sooner and we say so plainly.
- Every result is labelled **AI-generated**, both visibly and in the file's embedded metadata.
- **No fit, size or fabric claims, and no return-rate claims.**
- Delete a look, or all your data, at any time.

## Known limitations

- **Credits:** the Clothsy account started with 20 free credits. 1 credit per finished try-on (failures are refunded), 2 per outfit. The global cap protects the remaining balance, and judges may see "Fitting Room is full" once it's reached.
- **Garment types:** tops, jackets, trousers/jeans and skirts work well. Dresses and very revealing cuts (strappy, strapless, backless, high slits) tend to fail Clothsy's safety screening. Shoes aren't detected from flat product shots. The catalogue is clothing only, and one cami has try-on switched off.
- **Lower-body pieces** replace the bottom of whatever you're wearing in your photo, and the AI may invent a top half (for example turning a dress into a crop top). A photo in a fitted top with trousers or a skirt works best.
- **Outfits** are layered (2 try-ons). If the second layer fails, you keep the top look with a note.
- **Demo catalogue:** items are unbranded demo pieces with no prices or shop links. Product images should be replaced with owned or licensed photos before any public launch.
- **Email:** Supabase's built-in email sender is rate-limited to a few emails per hour.

## What's next

Retailer product feeds through affiliate networks, size guidance from real size charts, shareable looks, more garment types as the try-on model supports them, and measuring whether shoppers who try a piece on come back to it.
