import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Credential resolution order:
 *   1. Build-time env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)  <- Vercel
 *   2. Values saved at runtime from the Admin -> Settings panel (localStorage)
 *
 * v1 of this file hardcoded a specific project URL + anon key as the fallback
 * and never read import.meta.env at all, so environment variables configured
 * in Vercel had no effect. That is fixed here.
 */

const URL_KEY = 'gym_saas_supabase_url';
const KEY_KEY = 'gym_saas_supabase_anon_key';

const ENV_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ENV_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/**
 * Domain appended when someone signs in with a bare username.
 * "ajinas0496" -> "ajinas0496@gmail.com".
 * Must match the domain of the admin email seeded in supabase_schema.sql.
 */
export const LOGIN_DOMAIN = (import.meta.env.VITE_LOGIN_DOMAIN ?? 'gmail.com')
  .trim()
  .replace(/^@/, '');

let client: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

function readLocal(key: string): string {
  try {
    return (localStorage.getItem(key) ?? '').trim();
  } catch {
    return '';
  }
}

export function getStoredSupabaseCredentials(): { url: string; anonKey: string } {
  return {
    url: ENV_URL || readLocal(URL_KEY),
    anonKey: ENV_KEY || readLocal(KEY_KEY),
  };
}

/** True when both a URL and an anon key are available from any source. */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseCredentials();
  return Boolean(url && anonKey);
}

/** True when the credentials came from build-time env (so the UI can say so). */
export function isConfiguredFromEnv(): boolean {
  return Boolean(ENV_URL && ENV_KEY);
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  try {
    localStorage.setItem(URL_KEY, url.trim());
    localStorage.setItem(KEY_KEY, anonKey.trim());
  } catch (e) {
    console.error('Could not persist Supabase credentials:', e);
  }
  client = null; // force rebuild on next getSupabase()
}

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseCredentials();
  if (!url || !anonKey) return null;

  if (client && url === cachedUrl && anonKey === cachedKey) return client;

  try {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    cachedUrl = url;
    cachedKey = anonKey;
    return client;
  } catch (e) {
    console.error('Failed to initialise Supabase client:', e);
    client = null;
    return null;
  }
}

/**
 * Supabase Auth requires a syntactically valid email address; a bare username
 * such as "ajinasrm" is rejected outright. This lets staff keep typing their
 * username while the app sends a real address to GoTrue.
 */
export function normaliseIdentifier(identifier: string): string {
  const v = identifier.trim().toLowerCase();
  if (!v) return v;
  return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}`;
}
