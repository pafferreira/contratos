import { createBrowserClient } from "@supabase/ssr";
import { type DatabaseWithRelationships } from "./types";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient<DatabaseWithRelationships>(supabaseUrl, supabaseAnonKey);
}
