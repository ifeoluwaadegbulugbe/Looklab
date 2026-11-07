"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sends first-time visitors to the welcome screen once. Skipping or finishing onboarding marks it done. */
export function FirstVisitRedirect() {
  const router = useRouter();
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem("looklab.onboarded") === "1"; } catch {}
    if (!seen) router.replace("/welcome");
  }, [router]);
  return null;
}
