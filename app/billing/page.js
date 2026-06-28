'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { PLANS } from '../../lib/plans';
import PhoneShell from '../components/PhoneShell';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [usage, setUsage] = useState({ gmail: 0, contacts: 0, sent: 0 });
  const [invoices, setInvoices] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: p }, { count: gmailCount }, { count: contactCount }, { data: camps }, { data: inv }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('gmail_accounts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('campaigns').select('sent_count').eq('user_id', user.id),
        supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setProfile(p);
      setUsage({ gmail: gmailCount || 0, contacts: contactCount || 0, sent: (camps || []).reduce((s, c) => s + (c.sent_count || 0), 0) });
      setInvoices(inv || []);
    })();
  }, []);

  async function handleUpgrade(planKey) {
    setBusy(true);
    const res = await fetch('/api/billing/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planKey }),
    });
    const result = await res.json();
    setBusy(false);
    if (result.redirectUrl) window.location.href = result.redirectUrl;
    else alert(result.error || 'Gagal membuat transaksi');
  }

  if (!profile) return <PhoneShell><div className="screen active" /></PhoneShell>;

  const plan = profile.plan || 'trial';
  const limits = PLANS[plan];
  const daysLeft = profile.plan_expires_at ? Math.max(0, Math.ceil((new Date(profile.plan_expires_at) - new Date()) / 86400000)) : 0;

  return (
    <PhoneShell>
      <div className="screen active" id="screen-billing">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/profile" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Billing &amp; Paket</div>
          </div>
        </div>

        <div className="pscroll2">
          <div className="bill-hero">
            <div className="bh-deco"></div>
            <div className="bh-top">
              <div>
                <div className="bh-lbl">Paket aktif</div>
                <div className="bh-name">{limits.label} Plan</div>
                <div className="bh-exp">{profile.plan_expires_at ? `Berakhir ${new Date(profile.plan_expires_at).toLocaleDateString('id-ID')}` : '—'}</div>
              </div>
              <div className="bh-days"><div className="pd-num">{daysLeft}</div><div className="pd-lbl">hari tersisa</div></div>
            </div>
            {plan !== 'pro' && (
              <div className="bh-upgrade" onClick={() => handleUpgrade(plan === 'trial' ? 'basic' : 'pro')}>
                {busy ? 'Memproses…' : `Upgrade ke ${plan === 'trial' ? 'Basic' : 'Pro'}`}
              </div>
            )}
          </div>

          <div className="sec-ttl-pad">Penggunaan saat ini</div>
          <div className="usage-card">
            <div className="usage-row">
              <div><div className="usage-lbl">Akun Gmail terhubung</div>
                <div className="usage-bar-wrap"><div className="usage-bar" style={{ width: `${Math.min(100, (usage.gmail / limits.maxGmailAccounts) * 100)}%`, background: 'var(--blue)' }}></div></div>
              </div>
              <div className="usage-val">{usage.gmail} / {limits.maxGmailAccounts}</div>
            </div>
            <div className="usage-row">
              <div><div className="usage-lbl">Kontak tersimpan</div>
                <div className="usage-bar-wrap"><div className="usage-bar" style={{ width: `${Math.min(100, (usage.contacts / limits.maxContacts) * 100)}%`, background: 'var(--purple)' }}></div></div>
              </div>
              <div className="usage-val">{usage.contacts} / {limits.maxContacts}</div>
            </div>
            <div className="usage-row">
              <div><div className="usage-lbl">Total email terkirim</div></div>
              <div className="usage-val">{usage.sent}</div>
            </div>
          </div>

          <div className="sec-ttl-pad">Riwayat pembayaran</div>
          <div className="inv-list">
            {invoices.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Belum ada riwayat pembayaran.</div>}
            {invoices.map((inv) => (
              <div key={inv.id} className="inv-row">
                <div className="inv-ic"><i className="ti ti-receipt" aria-hidden="true"></i></div>
                <div className="inv-info">
                  <div className="inv-name">{inv.plan} Plan</div>
                  <div className="inv-date">{new Date(inv.created_at).toLocaleDateString('id-ID')} · {inv.status === 'paid' ? 'Lunas' : inv.status === 'failed' ? 'Gagal' : 'Menunggu'}</div>
                </div>
                <div className="inv-amt">Rp{inv.amount.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
