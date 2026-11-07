import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null when the keys are missing, so the app still works without accounts
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
