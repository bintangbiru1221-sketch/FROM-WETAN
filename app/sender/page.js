'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import PhoneShell from '../components/PhoneShell';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function SenderContent() {
  const supabase = createClient();
  const params = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [plan, setPlan] = useState('trial');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const PLAN_LIMIT = { trial: 1, basic: 2, pro: 5 };

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: profile }, { data: gmailAccounts }] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user.id).single(),
      supabase.from('gmail_accounts').select('*').eq('user_id', user.id).order('created_at'),
    ]);
    setPlan(profile?.plan || 'trial');
    setAccounts(gmailAccounts || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) setNotice(`Berhasil menghubungkan ${connected}`);
    if (error) setNotice(`Gagal menghubungkan: ${error}`);
  }, []);

  async function handleTest(id) {
    setBusyId(id);
    const res = await fetch('/api/gmail/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gmailAccountId: id }),
    });
    const result = await res.json();
    setNotice(result.success ? 'Koneksi berhasil ✓' : `Koneksi gagal: ${result.error}`);
    setBusyId(null);
    load();
  }

  async function handleDisconnect(id) {
    if (!confirm('Putuskan akun Gmail ini?')) return;
    setBusyId(id);
    await fetch('/api/gmail/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gmailAccountId: id }),
    });
    setBusyId(null);
    load();
  }

  const limit = PLAN_LIMIT[plan] || 1;
  const canAddMore = accounts.length < limit;

  return (
    <PhoneShell>
      <div className="screen active" id="screen-gmail">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/dashboard" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Sender Accounts</div>
          </div>
        </div>

        <div className="pscroll2">
          {notice && <div style={{ margin: '0 14px 10px', fontSize: 11.5, color: 'var(--txt-sub)' }}>{notice}</div>}

          <div style={{ margin: '0 14px 10px', fontSize: 11.5, color: 'var(--txt-m)' }}>
            {accounts.length} / {limit} akun terhubung (paket {plan})
          </div>

          <div className="gm-list" style={{ margin: '0 14px' }}>
            {loading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Memuat…</div>}
            {!loading && accounts.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Belum ada akun Gmail terhubung.</div>
            )}
            {accounts.map((acc) => (
              <div key={acc.id} className="gm-row">
                <div className={`sdot ${acc.status === 'active' ? 'sd-g' : 'sd-w'}`}></div>
                <div className="tpl-info" style={{ flex: 1 }}>
                  <div className="tpl-name">{acc.email}</div>
                  <div className="gm-st">{acc.status === 'active' ? 'Aktif · siap digunakan' : 'Bermasalah · perlu reauth'}</div>
                </div>
                <div className="gm-act b" onClick={() => handleTest(acc.id)}>
                  {busyId === acc.id ? 'Mengetes…' : 'Test'}
                </div>
                <div className="gm-act w" onClick={() => handleDisconnect(acc.id)} style={{ marginLeft: 6, color: 'var(--red)' }}>
                  Hapus
                </div>
              </div>
            ))}

            {canAddMore && (
              <a href="/api/gmail/connect" className="add-row">
                <div className="add-ic"><i className="ti ti-plus" aria-hidden="true"></i></div>
                <div className="add-txt">Hubungkan Gmail baru</div>
              </a>
            )}
            {!canAddMore && (
              <Link href="/billing" className="add-row">
                <div className="add-ic"><i className="ti ti-credit-card" aria-hidden="true"></i></div>
                <div className="add-txt">Upgrade paket untuk tambah akun</div>
              </Link>
            )}
          </div>
        </div>
        <BottomNav active="/sender" />
      </div>
    </PhoneShell>
  );
}

export default function SenderPage() {
  return (
    <Suspense fallback={<PhoneShell><div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><span style={{ color: 'var(--txt-m)', fontSize: 13 }}>Memuat…</span></div></PhoneShell>}>
      <SenderContent />
    </Suspense>
  );
}
