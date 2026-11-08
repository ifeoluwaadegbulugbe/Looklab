# LookLab: HackTheFashion Global '26 submission

**Track:** Try-On Commerce (with a touch of Styling & Wardrobe)
**Live app:** https://looklab-tau.vercel.app
**Repo:** https://github.com/ifeoluwaadegbulugbe/Looklab

---

## One-liner
LookLab is a fashion feed where every piece has a "Try it on me" button. A Fitting Room remembers your photo, so you can try, compare, build outfits and save looks in seconds.

## The problem
People find fashion on TikTok, Instagram and Pinterest, love how it looks on the model, and then guess. "Would this suit me?" is the moment most online fashion shopping falls apart. Most try-on tools stop at a single "upload two images" demo; they don't fit how people actually browse, compare and decide.

## Our solution
LookLab turns try-on into a loop: **discover → try → compare → decide.**

- **Discovery that leads to trying.** An editorial feed, 8 aesthetics, 6 collections and search. Every card has a Try button, and every product page leads with *Try it on*.
- **One photo, many pieces.** Upload once and tick consent. Your photo is reused for 24 hours, so the next piece is one tap. The **Fitting Room** keeps every look from your session.
- **Build an outfit.** Pick a top and a bottom. LookLab layers them: the top first, then the bottom over that result, so you see the full outfit on you.
- **Compare.** Two looks side by side, a reveal slider, and before/after against your own photo.
- **Save what you love.** Add your email and your guest account becomes a real one (same account, nothing lost). Saved looks outlive the 24-hour preview and follow you to any device.

## How we use the Clothsy AI API
- The official `clothsy-ai` SDK, **server-side only**. The browser never sees the key or calls the API.
- `images.upload` stores the shopper's photo once (free). Its id is reused for 24 hours across many `tryons.create` calls.
- The garment is **always resolved on the server from the product id** and sent with the exact product title, so shoppers can't point a try-on at arbitrary images.
- `tryons.retrieve` polling every 2.5 s, honouring `Retry-After`. Results and refreshed links are stored per session.
- **Layered outfits:** the step-1 result is re-uploaded as the person image for step 2. Same API, no shortcuts.
- **Credit-aware engineering:**
  - every click carries an idempotency key
  - a database rule allows only one running try-on per user
  - per-user and global caps (outfits count as 2) and a kill switch
  - failed try-ons are refunded by Clothsy and never counted
- On Day 1 we ran a garment test matrix against the real API and built the catalogue around what works: tops, jackets, trousers and skirts.

## Responsible by design
- **Adults only.** Explicit, unticked consent every time, before anything is uploaded.
- **We never store your photo.** It's resized in the browser, which also strips GPS, and streamed from memory. We disclose plainly that Clothsy keeps uploads for up to 35 days.
- **AI labels everywhere.** A visible badge on every result, and saved files are stored byte-for-byte so Clothsy's embedded AI label survives.
- **No fit, size or fabric claims.** No claims about reducing returns, because we don't have that data.
- **Your data is yours.** Delete a look, or everything, in one tap.
- **Security.** Row-level security on every table, verified with a two-user test. Same-origin checks on every write. No secrets in client code (scanned on the live site).

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (Auth, Postgres + RLS, Storage), Clothsy AI SDK, Vercel.

## Limitations (honest)
- A limited credit budget (20 at the start). Caps protect it, and the app shows a friendly "Fitting Room is full" screen when reached.
- Dresses and very revealing cuts often fail Clothsy's safety screening. Shoes aren't detected. The catalogue sticks to what works.
- Previews can't predict fit, and lower-body pieces may re-imagine what you're wearing above the waist.
- The catalogue is a demo: unbranded, no prices, no shop links.

## What's next
Retailer product feeds via affiliate networks, size guidance from real size charts, shareable looks, and measuring whether people who try something on come back to it.

---

# Demo video script (under 3 minutes)

**Before recording:**
- Sign in to your account on the device you'll record.
- Have 2–3 finished looks in the Fitting Room (and at least one saved look), so Compare and Saved don't depend on a live wait.
- Record one live generation separately and trim the wait to the scan animation plus the reveal.
- Use only your own photo, and spend no more than ~4 credits on recording (one single piece, one outfit).

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Scrolling a fashion feed; a model in a great jacket | "You love the outfit on the model. You have no idea how it'll look on you." |
| 0:12–0:22 | LookLab welcome, then pick two aesthetics | "This is LookLab. Discover it, try it, make it yours." |
| 0:22–0:40 | Home → a collection → a jacket → **Try it on** | "Every piece is one tap from being on you." |
| 0:40–1:00 | Add photo, **tick the 18+ consent**, See it on me, scan animation | "Adults only, explicit consent every time, powered by Clothsy AI's try-on API. We never store your photo." |
| 1:00–1:15 | Result appears with the **AI-generated try-on** badge | "That's me, in that jacket. Clearly labelled as an AI preview." |
| 1:15–1:35 | Back to browsing, Try on jeans: **"Using your photo from earlier"** | "My Fitting Room remembers my photo, so the next piece is one tap." |
| 1:35–1:55 | **Build an outfit**: top + jeans, "Step 1 of 2… Step 2 of 2", full outfit | "Or build a whole outfit. LookLab layers it: top first, then the bottom." |
| 1:55–2:15 | Fitting Room → tick two → **Compare**: slider and side by side | "Which one feels more me?" |
| 2:15–2:35 | **Save look**, then Saved › Looks | "Save the winner. It's kept on my account, past the 24-hour preview." |
| 2:35–2:50 | Privacy page; "preview, not a fit guarantee"; Delete my data | "We're honest about limits: it's a preview, and your data is yours to delete." |
| 2:50–3:00 | Logo, tagline, URL | "LookLab. See it on you before you decide." |
