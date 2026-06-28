'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import PhoneShell from '../components/PhoneShell';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [notifCampaign, setNotifCampaign] = useState(true);
  const [notifFailed, setNotifFailed] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  async function handleDeleteAccount() {
    if (!confirm('Yakin hapus akun? Semua data (kontak, campaign, riwayat) akan terhapus permanen.')) return;
    // Catatan: penghapusan akun Supabase Auth perlu service_role key,
    // jadi sebaiknya panggil API route khusus admin di sisi server (belum dibuat di starter ini).
    alert('Hubungi admin untuk proses hapus akun, atau buat API route /api/account/delete memakai SUPABASE_SERVICE_ROLE_KEY.');
  }

  return (
    <PhoneShell>
      <div className="screen active" id="screen-settings">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/profile" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Settings</div>
          </div>
        </div>
        <div className="pscroll2">
          <div className="set-sec-lbl">Notifikasi</div>
          <div className="gm-list" style={{ margin: '0 14px' }}>
            <div className="fact"><span className="fa-lbl">Campaign selesai</span>
              <div className={`toggle ${notifCampaign ? '' : 'off'}`} onClick={() => setNotifCampaign((v) => !v)}><div className="tthumb"></div></div>
            </div>
            <div className="fact"><span className="fa-lbl">Email gagal terkirim</span>
              <div className={`toggle ${notifFailed ? '' : 'off'}`} onClick={() => setNotifFailed((v) => !v)}><div className="tthumb"></div></div>
            </div>
            <div className="fact"><span className="fa-lbl">Laporan mingguan</span>
              <div className={`toggle ${notifWeekly ? '' : 'off'}`} onClick={() => setNotifWeekly((v) => !v)}><div className="tthumb"></div></div>
            </div>
          </div>

          <div className="set-sec-lbl">Keamanan</div>
          <div className="gm-list" style={{ margin: '0 14px' }}>
            <div className="fact" onClick={() => window.open('https://myaccount.google.com/permissions', '_blank')}>
              <span className="fa-lbl">Kelola akses Google</span>
              <span className="fa-val">Lihat <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true"></i></span>
            </div>
            <div className="fact" onClick={handleDeleteAccount}>
              <span className="fa-lbl" style={{ color: 'var(--red)' }}>Hapus akun</span>
              <span className="fa-val" style={{ color: 'var(--red)' }}><i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden="true"></i></span>
            </div>
          </div>

          <div className="set-sec-lbl">Tentang</div>
          <div className="gm-list" style={{ margin: '0 14px' }}>
            <div className="fact"><span className="fa-lbl">Versi aplikasi</span><span className="fa-val" style={{ color: 'var(--txt-m)' }}>1.0.0</span></div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
