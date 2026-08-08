import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local Storage Keys
const SUPABASE_URL_KEY = 'gym_saas_supabase_url';
const SUPABASE_KEY_KEY = 'gym_saas_supabase_anon_key';

let supabaseClient: SupabaseClient | null = null;

export function getStoredSupabaseCredentials(): { url: string; anonKey: string } {
  const url = localStorage.getItem(SUPABASE_URL_KEY) || 'https://cuhqepmgtfedrxotojpg.supabase.co';
  const anonKey = localStorage.getItem(SUPABASE_KEY_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aHFlcG1ndGZlZHJ4b3RvanBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMjc4MTgsImV4cCI6MjEwMTcwMzgxOH0.4klvwKbCd4DbKyRNKNQKaJLJ9A1w-8MupISGOoZOyj0';
  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_KEY_KEY, anonKey.trim());
  if (url && anonKey) {
    try {
      supabaseClient = createClient(url.trim(), anonKey.trim());
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  } else {
    supabaseClient = null;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const { url, anonKey } = getStoredSupabaseCredentials();
  if (url && anonKey) {
    try {
      supabaseClient = createClient(url, anonKey);
      return supabaseClient;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return null;
}
