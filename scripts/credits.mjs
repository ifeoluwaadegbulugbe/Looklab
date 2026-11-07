// Prints the Clothsy credit balance. Free: starts no try-on.
// Run: node --env-file=.env.local scripts/credits.mjs
import { Clothsy, friendlyMessage } from "clothsy-ai";

const key = process.env.CLOTHSY_API_KEY ?? "";
console.log(`Key present: ${key.length > 0}, prefix ok: ${key.startsWith("clothsy_live_")}`);
try {
  console.log("Credits:", await new Clothsy().account.credits());
} catch (e) {
  console.error("Failed:", e?.code ?? "", friendlyMessage(e));
  process.exitCode = 1;
}
