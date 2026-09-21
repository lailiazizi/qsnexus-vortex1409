// Supabase client (cloud database + file storage).
//
// Keys are read from:
//   - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (Vercel env vars, local .env)
//   - SUPABASE_URL / SUPABASE_ANON_KEY            (AI Studio secrets, injected by vite.config.ts)
//
// Only the public "anon" key belongs here. NEVER put the service_role key in front-end code.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://whllmuyajicvczscopfk.supabase.co';
const url: string = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

/** Public Storage bucket that holds the image markers (and, later, trained .zpt files). */
export const MARKER_BUCKET = 'markers';

