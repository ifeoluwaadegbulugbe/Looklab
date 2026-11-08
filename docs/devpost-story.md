## Inspiration
We all do it: scroll TikTok or Pinterest, fall for an outfit on a model, and then guess whether it would work on us. That gap between *"I love how this looks on her"* and *"I can see how this looks on me"* is where online fashion shopping breaks down. Most virtual try-on demos stop at "upload two images, get one result". We wanted try-on to feel like a **fitting room**: somewhere you try a few things, compare them, and decide.

## What it does
**LookLab** is a fashion discovery app where every piece has a **Try it on** button.

- **Discover:** an editorial feed, 8 aesthetics (Old Money, Streetwear, Y2K…), 6 collections, search and filters. A 2-step onboarding puts your kind of pieces first, using a transparent tag-overlap score, not a black box.
- **Try it on:** upload one photo, tick an 18+ consent box, and about 20 seconds later you see an AI-generated preview of yourself wearing the piece, powered by the **Clothsy AI** try-on API.
- **Fitting Room:** your photo is reused for 24 hours, so the next piece is one tap. Every look from your session is kept together.
- **Build an outfit:** pick a top and a bottom. LookLab **layers** them: the top goes on first, then the bottom is added over that result, so you see the whole outfit on you.
- **Compare:** two looks side by side, a reveal slider, and before/after against your own photo.
- **Save looks:** add your email and your guest account becomes a real one (same account, nothing lost). Saved looks outlive the 24-hour preview and follow you to any device.
- **Your data is yours:** delete a look, or everything, in one tap.

## How we built it
- **Next.js 16** (App Router, Cache Components) + React 19 + TypeScript + Tailwind CSS v4, deployed on **Vercel**.
- **Supabase** for auth (invisible anonymous sign-in on first try-on, upgraded to email on save), Postgres with **row-level security on every table**, and Storage (a public catalogue bucket and a private saved-looks bucket).
- **Clothsy AI** through its official SDK, **server-side only**. The browser never sees the API key and never calls the API. The garment is always resolved on the server **from the product id**, so nobody can point a try-on at an arbitrary image.
- **Credit-aware engineering.** Credits are real money, and we started with 20:
  - every click carries an **idempotency key**
  - a **database unique index** allows only one running try-on per user, so a double click can never cost twice
  - per-user and global caps, plus a kill switch
  - failed try-ons are refunded by the provider and never counted
- On **Day 1** we ran a garment test matrix against the real API *before* building the catalogue, and designed around what actually works.
- Every safeguard has a test script: two-user RLS (38 checks), every refusal path of the try-on route (18), save/delete looks (15), delete-my-data (12) and layered outfits (11). None of them spend credits.

## Challenges we ran into
- **What the model accepts.** Our test matrix showed tops, jackets, jeans and skirts work beautifully. But dresses and very revealing cuts (strapless, strappy, high slits) consistently failed the provider's safety screening, and shoes weren't detected at all. We cut those categories and turned try-on off for one cami that failed twice, rather than shipping a broken experience.
- **Full outfits for one credit.** Our first idea was to combine a top and a bottom into one flat-lay image and spend a single credit. It looked clever, but in a live test the AI **ignored the top completely**. We switched to an honest **layered** approach: two try-ons, where the second uses the first result as the new "you". If the second layer fails, you keep the top look instead of losing everything.
- **Lower-body garments re-imagine your top half.** Trying a skirt on a photo of someone in a dress makes the AI invent a new top. We turned that into photo guidance ("works best wearing a fitted top with trousers or a skirt").
- **Auth edge cases.** Upgrading a guest to an email account without losing their Fitting Room, handling "this email already has an account", and Supabase's built-in email rate limit all needed careful handling.

## Accomplishments that we're proud of
- A **real, working try-on loop**, not a mock: discover → try → reuse your photo → compare → save.
- **Responsible by design:**
  - explicit consent every time
  - **we never store your photo**: it's resized in the browser, which strips GPS, and streamed from memory
  - honest disclosure that the provider keeps uploads for up to 35 days
  - AI labels on every result, with saved files stored byte-for-byte so the provider's embedded AI label survives
  - no fit, size or return-rate claims
- **Security we verified:** we scanned the live site's JavaScript for secrets and found none, and a two-user test proves nobody can read or delete anyone else's looks.

## What we learned
- Test the AI on real inputs **first**. One afternoon of a test matrix saved us from building a catalogue full of garments that can't be tried on.
- Honest limitations make a better product than clever shortcuts. The layered outfit costs more, but it shows people what they actually picked.
- When every API call costs money, idempotency, single-flight guards and caps aren't nice-to-haves. They are the product working correctly.

## What's next for LookLab
- Real retailer catalogues through affiliate product feeds.
- Size guidance from real size charts.
- Shareable looks ("which one?" for your group chat).
- Measuring whether people who try something on come back to it.
