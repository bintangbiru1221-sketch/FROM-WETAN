import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Dipakai di Server Component, Server Action, dan Route Handler.
// Otomatis membawa session login user lewat cookie.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // dipanggil dari Server Component tanpa boleh set cookie - aman diabaikan,
            // karena middleware.js yang akan menangani refresh session.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {}
        },
      },
    }
  );
}

// Client dengan SERVICE_ROLE key — akses penuh, bypass Row Level Security.
// HANYA dipakai di server (cron job, webhook), JANGAN PERNAH dikirim ke browser.
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
