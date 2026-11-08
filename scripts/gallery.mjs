// Captures Devpost gallery screenshots (3:2) of the live site with headless Edge.
// No try-on results or faces. Output: private/gallery/*.jpg (git-ignored).
//   node scripts/gallery.mjs [baseUrl]
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const BASE = process.argv[2] ?? "https://looklab-tau.vercel.app";
const OUT = new URL("../private/gallery/", import.meta.url);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--hide-scrollbars"] });
const page = await browser.newPage();
const desktop = { width: 1500, height: 1000, deviceScaleFactor: 1.5 };
const mobile = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
await page.setViewport(desktop);

const settle = async (ms = 900) => {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, ms));
};
const go = async (path) => { await page.goto(BASE + path, { waitUntil: "networkidle2" }); await settle(); };
const shot = async (name) => {
  const buf = await page.screenshot({ type: "jpeg", quality: 88 });
  await writeFile(new URL(name, OUT), buf);
  console.log(`${name}  ${(buf.length / 1024).toFixed(0)} KB`);
  return buf;
};
const clickText = (selector, text) =>
  page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent?.includes(t));
    if (!el) throw new Error(`not found: ${t}`);
    el.scrollIntoView({ block: "center" });
    el.click();
  }, selector, text);

// A returning visitor with picks, so Home shows "For you" instead of redirecting to Welcome.
await go("/privacy");
await page.evaluate(() => {
  localStorage.setItem("looklab.onboarded", "1");
  localStorage.setItem("looklab.prefs", JSON.stringify({ sections: ["women"], aesthetics: ["old-money", "streetwear"] }));
});

await go("/");
await shot("01-home.jpg");

await page.evaluate(() => document.querySelector("#collections")?.scrollIntoView({ block: "start" }));
await page.evaluate(() => window.scrollBy(0, -90));
await settle(500);
await shot("02-collections-and-categories.jpg");

await go("/shop");
await page.evaluate(() => window.scrollTo(0, 60));
await settle(500);
await shot("03-shop.jpg");

await go("/product/burgundy-leather-cropped-bomber");
await shot("04-product.jpg");

await clickText("button", "Try it on");
await settle(800);
await page.evaluate(() => (document.activeElement)?.blur?.());
await shot("05-try-on-consent.jpg");

await go("/outfit?with=navy-pinstripe-off-shoulder-top");
await clickText("button[role=radio]", "Light-wash barrel-leg jeans");
await page.evaluate(() => window.scrollTo(0, 0));
await settle(600);
await shot("06-build-an-outfit.jpg");

await page.evaluate(() => localStorage.removeItem("looklab.prefs"));
await go("/welcome");
await clickText("button", "Start");
await settle(300);
await clickText("button", "Women");
await clickText("button", "Continue");
await settle(400);
for (const a of ["Old Money", "Streetwear", "Afro-inspired"]) await clickText("button[aria-pressed]", a);
await page.evaluate(() => window.scrollTo(0, 0));
await settle(400);
await shot("07-onboarding.jpg");

await go("/privacy");
await shot("08-privacy-and-ai.jpg");

// Mobile: three phone screens on a brand-colour 3:2 canvas.
await page.setViewport(mobile);
await page.evaluate(() => localStorage.setItem("looklab.prefs", JSON.stringify({ sections: ["women"], aesthetics: ["y2k", "streetwear"] })));
const phones = [];
for (const path of ["/", "/product/light-wash-barrel-jeans", "/outfit?with=black-cropped-leather-jacket"]) {
  await go(path);
  if (path.startsWith("/outfit")) { await clickText("button[role=radio]", "Brown plaid bias-cut midi skirt"); await page.evaluate(() => window.scrollTo(0, 0)); await settle(500); }
  phones.push(await page.screenshot({ type: "png" }));
}
const W = 2250, H = 1500, phoneH = 1280;
const framed = await Promise.all(phones.map(async (p) => {
  const img = await sharp(p).resize({ height: phoneH }).toBuffer({ resolveWithObject: true });
  const radius = 48;
  const mask = Buffer.from(`<svg width="${img.info.width}" height="${img.info.height}"><rect width="100%" height="100%" rx="${radius}" ry="${radius}"/></svg>`);
  return sharp(img.data).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer({ resolveWithObject: true });
}));
const gap = 70;
const total = framed.reduce((s, f) => s + f.info.width, 0) + gap * (framed.length - 1);
let x = Math.round((W - total) / 2);
const layers = framed.map((f) => { const l = { input: f.data, left: x, top: Math.round((H - phoneH) / 2) }; x += f.info.width + gap; return l; });
const mobileShot = await sharp({ create: { width: W, height: H, channels: 3, background: "#EDE4FF" } }).composite(layers).jpeg({ quality: 88 }).toBuffer();
await writeFile(new URL("09-mobile.jpg", OUT), mobileShot);
console.log(`09-mobile.jpg  ${(mobileShot.length / 1024).toFixed(0)} KB`);

await browser.close();
