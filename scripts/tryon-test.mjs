// Day 1 try-on test matrix. SPENDS ONE CREDIT PER SUCCESSFUL TRY-ON.
//
//   node --env-file=.env.local scripts/tryon-test.mjs                 # dry run: lists what would run, spends nothing
//   node --env-file=.env.local scripts/tryon-test.mjs --yes           # runs all garments
//   node --env-file=.env.local scripts/tryon-test.mjs --yes top dress # runs only the named garments
//
// Reads private/person.jpg and private/garments/*.jpg (git-ignored). Uploads are free.
// Results go to private/results/ and a summary to private/results/summary.json.
// Logs no keys, image ids or result URLs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Clothsy, ClothsyError, friendlyMessage } from "clothsy-ai";

const GARMENTS = {
  top: "Navy pinstripe off-shoulder button top",
  dress: "Brown mock-neck draped mini dress with gold buckle",
  dress2: "Apricot strapless chiffon maxi dress with side slit",
  jacket: "Burgundy leather cropped bomber jacket",
  trousers: "Mid-blue wide-leg high-rise jeans",
  skirt: "Black faux-leather mini skirt",
  shoes: "Burgundy patent pointed-toe mule heels",
  // Full-outfit experiment: top + bottom combined into one flat-lay garment image (1 credit).
  outfit: "Outfit: navy pinstripe off-shoulder top with light-wash barrel-leg jeans",
};

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const picked = args.filter((a) => !a.startsWith("--"));
const names = picked.length ? picked : Object.keys(GARMENTS);
for (const n of names) if (!GARMENTS[n]) throw new Error(`Unknown garment "${n}"`);

console.log(`Garments: ${names.join(", ")} (up to ${names.length} credits)`);
if (!confirmed) {
  console.log("Dry run. Add --yes to spend credits.");
  process.exit(0);
}

const clothsy = new Clothsy();
const outDir = new URL("../private/results/", import.meta.url);
await mkdir(outDir, { recursive: true });

console.log("Credits before:", await clothsy.account.credits());

const jpeg = async (path) => {
  const bytes = await readFile(new URL(`../private/${path}`, import.meta.url));
  return new Blob([bytes], { type: "image/jpeg" });
};
const person = await clothsy.images.upload(await jpeg("person.jpg"), {
  filename: "person.jpg",
  contentType: "image/jpeg",
});
console.log("Person photo uploaded.");

const summary = [];
for (const name of names) {
  const title = GARMENTS[name];
  const started = Date.now();
  const row = { garment: name, title };
  try {
    const garment = await clothsy.images.upload(await jpeg(`garments/${name}.jpg`), {
      filename: `${name}.jpg`,
      contentType: "image/jpeg",
    });
    const created = await clothsy.tryons.create({
      person: { imageId: person.id },
      garment: { imageId: garment.id },
      title,
      consent: true,
      idempotencyKey: `looklab-test-${name}-${started}`,
    });
    row.jobId = created.id;

    let job = created;
    while (job.status === "pending") {
      if (Date.now() - started > 180_000) throw new Error("Timed out after 3 minutes");
      await new Promise((r) => setTimeout(r, 2500));
      job = await clothsy.tryons.retrieve(created.id);
    }
    row.status = job.status;
    row.seconds = Math.round((Date.now() - started) / 1000);

    if (job.status === "success") {
      const res = await fetch(job.resultUrl);
      const type = res.headers.get("content-type") ?? "";
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      // Bytes stored exactly as downloaded, so the embedded AI label survives.
      await writeFile(new URL(`${name}.${ext}`, outDir), Buffer.from(await res.arrayBuffer()));
      row.file = `private/results/${name}.${ext}`;
      row.contentType = type;
      // Open question (c): does a later retrieve return the same result URL? (free)
      const again = await clothsy.tryons.retrieve(created.id);
      row.reRetrieve = { status: again.status, sameUrl: again.resultUrl === job.resultUrl };
    } else {
      row.message = job.message ?? null;
    }
  } catch (e) {
    row.status = "error";
    row.code = e instanceof ClothsyError ? e.code : "SCRIPT_ERROR";
    row.message = friendlyMessage(e);
    row.seconds = Math.round((Date.now() - started) / 1000);
  }
  console.log(`${name}: ${row.status} in ${row.seconds}s${row.code ? ` (${row.code})` : ""}${row.message ? ` - ${row.message}` : ""}`);
  summary.push(row);
}

console.log("Credits after:", await clothsy.account.credits());
const summaryFile = `summary-${names.join("-")}.json`;
await writeFile(new URL(summaryFile, outDir), JSON.stringify(summary, null, 2));
console.log(`Summary written to private/results/${summaryFile}`);
