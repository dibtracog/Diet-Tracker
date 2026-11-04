"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Next.js only inlines NEXT_PUBLIC_* values when they're read directly like this.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase is configured. Without it the app runs local-only, as before. */
export const cloudEnabled = !!(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  if (!client) {
    client = createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}
