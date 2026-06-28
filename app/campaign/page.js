'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import PhoneShell from '../components/PhoneShell';
import Link from 'next/link';

const INTERVALS = [5, 7, 10, 12, 15, 30, 60, 120];

export const dynamic = 'force-dynamic';

export default function CampaignPage() {
  const supabase = createClient();
  const router = useRouter();

  const [accounts, setAccounts] = useState([]);
  const [contactCount, setContactCount] = useState(0);
  const [plan, setPlan] = useState('trial');

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [senderMode, setSenderMode] = useState('single');
  const [gmailAccountId, setGmailAccountId] = useState('');
  const [batchSize, setBatchSize] = useState(20);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: profile }, { data: gmailAccounts }, { count }] = await Promise.all([
        supabase.from('profiles').select('plan').eq('id', user.id).single(),
        supabase.from('gmail_accounts').select('*').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setPlan(profile?.plan || 'trial');
      setAccounts(gmailAccounts || []);
      setContactCount(count || 0);
      if (gmailAccounts?.[0]) setGmailAccountId(gmailAccounts[0].id);
    })();
  }, []);

  const batches = Math.ceil(contactCount / batchSize) || 0;
  const totalMinutes = Math.max(batches - 1, 0) * intervalMinutes;
  const jam = Math.floor(totalMinutes / 60);
  const menit = totalMinutes % 60;
  const estimasi = jam > 0 ? `±${jam} jam${menit > 0 ? ' ' + menit + ' menit' : ''}` : `±${menit} menit`;
  const canAutoRotate = plan === 'pro';

  async function handleSubmit() {
    setErrorMsg('');
    if (!name || !subject || !bodyHtml) { setErrorMsg('Lengkapi nama, subject, dan isi email.'); return; }
    if (senderMode === 'single' && !gmailAccountId) { setErrorMsg('Pilih akun Gmail pengirim.'); return; }

    setSubmitting(true);
    const res = await fetch('/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, bodyHtml, senderMode, gmailAccountId, batchSize, intervalMinutes }),
    });
    const result = await res.json();
    setSubmitting(false);

    if (!res.ok) { setErrorMsg(result.error); return; }
    router.push(`/campaign/${result.campaignId}`);
  }

  return (
    <PhoneShell>
      <div className="screen active" id="screen-campaign">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/dashboard" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Campaign Baru</div>
          </div>
        </div>

        <div className="pscroll2">
          {errorMsg && <div style={{ margin: '0 14px 10px', fontSize: 11.5, color: 'var(--red)' }}>{errorMsg}</div>}

          <div className="gm-list" style={{ margin: '0 14px 12px', padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama campaign"
              style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 9, fontSize: 12.5 }} />
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject email"
              style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 9, fontSize: 12.5 }} />
            <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="Isi email — gunakan {{nama}} untuk personalisasi"
              rows={5} style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 9, fontSize: 12.5, resize: 'vertical' }} />
          </div>

          <div className="gm-list" style={{ margin: '0 14px 12px', padding: 13 }}>
            <div className="fact"><span className="fa-lbl">Kirim dari</span></div>
            <select value={senderMode} onChange={(e) => setSenderMode(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5, marginTop: 6 }}>
              <option value="single">Satu akun Gmail tertentu</option>
              <option value="auto_rotate" disabled={!canAutoRotate}>Auto Rotate {!canAutoRotate && '(khusus Pro)'}</option>
            </select>
            {senderMode === 'single' && (
              <select value={gmailAccountId} onChange={(e) => setGmailAccountId(e.target.value)}
                style={{ width: '100%', border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5, marginTop: 8 }}>
                <option value="">Pilih akun Gmail…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
              </select>
            )}
          </div>

          <div className="gm-list" style={{ margin: '0 14px 12px', padding: 13 }}>
            <div className="fact">
              <span className="fa-lbl">Email per kiriman</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="qty-btn qty-minus" onClick={() => setBatchSize((v) => Math.max(5, v - 5))}><i className="ti ti-minus" aria-hidden="true"></i></div>
                <span className="qty-val" style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 16, minWidth: 20, textAlign: 'center', display: 'inline-block' }}>{batchSize}</span>
                <div className="qty-btn qty-plus" onClick={() => setBatchSize((v) => Math.min(200, v + 5))}><i className="ti ti-plus" aria-hidden="true"></i></div>
              </div>
            </div>
            <div style={{ marginTop: 7 }} className="int-grid">
              {INTERVALS.map((m) => (
                <div key={m} className={`int-btn ${intervalMinutes === m ? 'on' : ''}`} onClick={() => setIntervalMinutes(m)}>
                  {m < 60 ? `${m} mnt` : `${m / 60} jam`}
                </div>
              ))}
            </div>
          </div>

          <div className="est-box" style={{ margin: '0 14px 12px' }}>
            <i className="ti ti-clock" aria-hidden="true" style={{ color: '#92400E' }}></i>
            <div className="est-txt">
              Estimasi selesai: <span className="est-val">{estimasi}</span> · {batches} batch · {contactCount} kontak total
            </div>
          </div>

          <button onClick={handleSubmit} disabled={submitting} className="cta-btn" style={{ margin: '0 14px', width: 'calc(100% - 28px)', border: 'none' }}>
            {submitting ? 'Memulai campaign…' : 'Mulai Campaign'}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
