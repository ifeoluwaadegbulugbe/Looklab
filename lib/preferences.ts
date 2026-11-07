"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface StylePrefs { sections: string[]; aesthetics: string[] }
const KEY = "looklab.prefs";
const EVENT = "looklab:prefs";
export const MAX_AESTHETICS = 3;

let cachedRaw: string | null | undefined;
let cachedValue: StylePrefs | null = null;

/** Preferences live in localStorage first (no account needed); synced to the profile when a user exists. */
export function readPrefs(): StylePrefs | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const v = raw ? (JSON.parse(raw) as StylePrefs) : null;
    cachedValue = v && Array.isArray(v.sections) && Array.isArray(v.aesthetics) ? v : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

export function subscribePrefs(cb: () => void) {
  const on = () => cb();
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => { window.removeEventListener(EVENT, on); window.removeEventListener("storage", on); };
}

export async function savePrefs(prefs: StylePrefs) {
  const clean = { sections: prefs.sections, aesthetics: prefs.aesthetics.slice(0, MAX_AESTHETICS) };
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch {}
  window.dispatchEvent(new Event(EVENT));
  // Only sync if a user already exists; never create one just for preferences.
  const sb = getBrowserSupabase();
  const { data } = await sb.auth.getSession();
  if (data.session) {
    await sb.from("style_preferences").upsert({
      user_id: data.session.user.id, sections: clean.sections, aesthetic_slugs: clean.aesthetics,
    });
  }
}

export function markOnboarded() {
  try { localStorage.setItem("looklab.onboarded", "1"); } catch {}
}

/** Same transparent score as the server: shared aesthetic tags ×2, +1 for a section match. */
export function scoreForYouClient(p: { aesthetics: string[]; section: string }, prefs: StylePrefs) {
  const overlap = p.aesthetics.filter((a) => prefs.aesthetics.includes(a)).length;
  const sectionMatch = prefs.sections.length === 0 || prefs.sections.includes(p.section) || p.section === "unisex" ? 1 : 0;
  return overlap * 2 + sectionMatch;
}
