'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { PLANS } from '../../lib/plans';
import PhoneShell from '../components/PhoneShell';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUser(user);
      setProfile(p);
    })();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!user) return <PhoneShell><div className="screen active" /></PhoneShell>;

  const initials = (profile?.full_name || user.email || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const planLabel = PLANS[profile?.plan || 'trial'].label;

  return (
    <PhoneShell>
      <div className="screen active" id="screen-profile">
        <div className="topnav">
          <div className="ptitle" style={{ fontWeight: 700 }}>Profil</div>
        </div>
        <div className="pscroll2">
          <div className="prof-hero">
            <div className="prof-av">{initials}</div>
            <div className="prof-name">{profile?.full_name || 'Pengguna'}</div>
            <div className="prof-email">{user.email}</div>
            <div className="prof-badge">{planLabel} Plan</div>
          </div>

          <div className="menu-list">
            <Link href="/billing" className="menu-row">
              <div className="menu-ic" style={{ background: 'var(--pink-lt)', color: 'var(--pink)' }}><i className="ti ti-credit-card" aria-hidden="true"></i></div>
              <div className="menu-lbl">Billing &amp; Paket</div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--txt-m)', fontSize: 15 }} aria-hidden="true"></i>
            </Link>
            <Link href="/templates" className="menu-row">
              <div className="menu-ic" style={{ background: 'var(--purple-lt)', color: 'var(--purple)' }}><i className="ti ti-template" aria-hidden="true"></i></div>
              <div className="menu-lbl">Templates</div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--txt-m)', fontSize: 15 }} aria-hidden="true"></i>
            </Link>
            <Link href="/logs" className="menu-row">
              <div className="menu-ic" style={{ background: 'var(--teal-lt)', color: 'var(--teal)' }}><i className="ti ti-history" aria-hidden="true"></i></div>
              <div className="menu-lbl">Logs pengiriman</div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--txt-m)', fontSize: 15 }} aria-hidden="true"></i>
            </Link>
            <Link href="/settings" className="menu-row">
              <div className="menu-ic" style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}><i className="ti ti-settings" aria-hidden="true"></i></div>
              <div className="menu-lbl">Settings</div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--txt-m)', fontSize: 15 }} aria-hidden="true"></i>
            </Link>
          </div>

          <div className="menu-list">
            <div className="menu-row danger" onClick={handleLogout}>
              <div className="menu-ic"><i className="ti ti-logout" aria-hidden="true"></i></div>
              <div className="menu-lbl">Keluar</div>
            </div>
          </div>
        </div>
        <BottomNav active="/profile" />
      </div>
    </PhoneShell>
  );
}
