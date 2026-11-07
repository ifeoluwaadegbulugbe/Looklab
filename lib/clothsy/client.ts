import "server-only";
import { Clothsy } from "clothsy-ai";

// lib/clothsy is the ONLY place that imports clothsy-ai. The key never leaves the server.
let client: Clothsy | undefined;

export function getClothsy(): Clothsy {
  client ??= new Clothsy(); // reads CLOTHSY_API_KEY
  return client;
}
