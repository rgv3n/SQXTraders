import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ============================================================
// Graceful fallback: if env vars are placeholders or missing,
// create a client with dummy values so the app can still render.
// Pages will show empty states instead of a blank crash screen.
// ============================================================
const isConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey !== 'your_supabase_anon_key';

if (!isConfigured) {
    console.warn(
        '[EventOS] Supabase is not configured. ' +
        'Edit .env.local and set real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
        'The app will render in demo/offline mode.'
    );
}

export const supabase: SupabaseClient = createClient(
    isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isConfigured ? supabaseAnonKey : 'placeholder_key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    }
);

/** True when Supabase is properly configured */
export const isSupabaseConfigured = isConfigured;
