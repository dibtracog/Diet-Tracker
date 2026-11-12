/**
 * Runs a Next.js command with cloud sync switched off, whatever .env.local says.
 * Handy for trying the published build (offline support, service worker) with
 * throwaway data in this browser instead of your real account:
 *
 *   node scripts/local-mode.mjs build
 *   node scripts/local-mode.mjs start -p 3100
 */

import { createRequire } from "node:module";

// Already-set variables win over .env.local, even when empty.
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

createRequire(import.meta.url)("next/dist/bin/next");
