import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy & AI info" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Privacy &amp; AI info</h1>
      <p className="mt-2 text-lg">Plain language, no small print.</p>

      <div className="mt-8 flex flex-col gap-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-2">
        <section>
          <h2>Adults only</h2>
          <p>Virtual try-on is for people aged 18 or over. Only upload a photo of yourself. Never upload a photo of a child or of someone who hasn&apos;t agreed.</p>
        </section>

        <section>
          <h2>What happens when you try something on</h2>
          <ul>
            <li>Your browser shrinks your photo to 1600 px and re-saves it as a JPEG. This removes hidden data such as GPS location.</li>
            <li>Our server passes the photo straight to <strong>Clothsy AI</strong>, our try-on provider, together with the product image and name. LookLab never saves your photo to disk, our database or our logs.</li>
            <li>Clothsy AI creates the try-on image. The result link works for 24 hours.</li>
            <li>We ask for your consent every time, before anything is uploaded.</li>
          </ul>
        </section>

        <section>
          <h2>How long your photo is kept</h2>
          <p>
            Clothsy AI keeps uploaded photos for <strong>up to 35 days</strong> and then deletes them automatically. LookLab can&apos;t
            delete Clothsy&apos;s copy sooner, because the provider doesn&apos;t offer a way to. Clothsy AI says it doesn&apos;t use your
            photos to train its AI models. During those 35 days, LookLab can reuse your uploaded photo for 24 hours so you don&apos;t have to add it again for every piece.
          </p>
        </section>

        <section>
          <h2>What LookLab stores</h2>
          <ul>
            <li>An anonymous account ID, created when you first try something on or tap a heart.</li>
            <li>Your picks (sections and aesthetics), hearted items, and a record of your try-ons: which product, the status, and the 24-hour result link.</li>
            <li>The provider&apos;s ID for your uploaded photo, for 24 hours, so you can reuse it. Never the photo itself.</li>
            <li>No name, no measurements, no body shape, no size data.</li>
          </ul>
        </section>

        <section>
          <h2>AI-generated images</h2>
          <p>
            Every try-on is an AI-generated preview, labelled &ldquo;AI-generated try-on&rdquo;. Each image file also carries an
            invisible AI label added by Clothsy AI. A preview can&apos;t tell you how something will fit, what size to buy, or how
            the fabric will move. Colour and drape may differ from the real garment.
          </p>
        </section>

        <section>
          <h2>Demo catalogue</h2>
          <p>LookLab is a hackathon demo. Catalogue items are demo pieces with no brand, price or shop link.</p>
        </section>

        <section>
          <h2>Deleting your data</h2>
          <p>
            Go to <a href="/me" className="underline">Me</a> and tap <strong>Delete my data</strong>. It permanently removes your try-on history, saved looks and their images, hearts, picks and your anonymous account from LookLab. Clothsy&apos;s copy of your photo follows the up-to-35-day rule above.
          </p>
        </section>
      </div>
    </main>
  );
}
