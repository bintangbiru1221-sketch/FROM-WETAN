'use client';

import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center',
      background: 'var(--cream)',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div className="logo-box" style={{ width: 56, height: 56, fontSize: 24, marginBottom: 16, margin: '0 auto 16px' }}>
          <i className="ti ti-send" aria-hidden="true"></i>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', marginBottom: 6 }}>WETAN GANG</h1>
        <p style={{ fontSize: 13, color: 'var(--txt-m)', marginBottom: 28 }}>
          Broadcast email premium dari satu dashboard.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="cta-btn"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: 'none' }}
        >
          <i className="ti ti-mail" aria-hidden="true"></i>
          Masuk dengan Google
        </button>

        <p style={{ fontSize: 10.5, color: 'var(--txt-m)', marginTop: 16 }}>
          Dengan masuk, akun Gmail utama Anda dipakai untuk login.
          Akun Gmail untuk pengiriman broadcast dihubungkan terpisah di halaman Sender Accounts.
        </p>
      </div>
    </div>
  );
}
