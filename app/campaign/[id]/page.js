'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import PhoneShell from '../../components/PhoneShell';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function MonitorPage() {
  const supabase = createClient();
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [paused, setPaused] = useState(false);

  async function load() {
    const { data: camp } = await supabase.from('campaigns').select('*').eq('id', id).single();
    const { data: recs } = await supabase
      .from('campaign_recipients').select('*').eq('campaign_id', id)
      .order('batch_number', { ascending: false }).limit(20);
    setCampaign(camp);
    setRecipients(recs || []);
    if (camp) setPaused(camp.status === 'paused');
  }

  useEffect(() => {
    load();
    // polling tiap 5 detik supaya progress terlihat real-time tanpa perlu refresh manual
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id]);

  async function togglePause() {
    const newStatus = paused ? 'running' : 'paused';
    await supabase.from('campaigns').update({ status: newStatus }).eq('id', id);
    setPaused(!paused);
    load();
  }

  if (!campaign) {
    return (
      <PhoneShell>
        <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span style={{ color: 'var(--txt-m)', fontSize: 13 }}>Memuat campaign…</span>
        </div>
      </PhoneShell>
    );
  }

  const pct = campaign.total_recipients ? Math.round((campaign.sent_count / campaign.total_recipients) * 100) : 0;
  const pending = Math.max(campaign.total_recipients - campaign.sent_count - campaign.failed_count, 0);
  const totalBatches = Math.ceil(campaign.total_recipients / campaign.batch_size);
  const currentBatch = Math.min(Math.floor(campaign.sent_count / campaign.batch_size) + 1, totalBatches);

  const statusLabel = { running: 'Sedang berjalan', paused: 'Dipause', completed: 'Selesai', failed: 'Gagal', draft: 'Draft' };

  return (
    <PhoneShell>
      <div className="screen active" id="screen-monitor">
        <div className="mon-hero" style={{ background: 'linear-gradient(135deg, #014BAA, #0369A1)', color: 'white', padding: '16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Link href="/dashboard" style={{ color: 'white' }}><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="pause-btn" onClick={togglePause}>
              <i className={`ti ${paused ? 'ti-player-play' : 'ti-player-pause'}`} aria-hidden="true"></i>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="live-pulse" style={{ display: paused ? 'none' : 'inline-block' }}></div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{campaign.name}</div>
            <div style={{ fontSize: 11.5, opacity: 0.8 }}>{statusLabel[campaign.status] || campaign.status}</div>
          </div>
        </div>

        <div className="pscroll2">
          <div className="live-stats-row" style={{ margin: '12px 14px 0' }}>
            <div className="live-stat"><div className="ls-val">{campaign.total_recipients}</div><div className="ls-lbl">Total</div></div>
            <div className="live-stat"><div className="ls-val">{campaign.sent_count}</div><div className="ls-lbl">Kirim</div></div>
            <div className="live-stat"><div className="ls-val">{pending}</div><div className="ls-lbl">Tunggu</div></div>
            <div className="live-stat"><div className="ls-val">{campaign.failed_count}</div><div className="ls-lbl">Gagal</div></div>
          </div>

          <div style={{ margin: '10px 14px' }}>
            <div className="live-progress"><div className="lp-bar" style={{ width: `${pct}%` }}></div></div>
            <div className="live-foot">Batch {currentBatch}/{totalBatches} · {pct}% selesai</div>
            {campaign.next_batch_at && campaign.status === 'running' && (
              <div className="live-foot">Batch berikutnya: {new Date(campaign.next_batch_at).toLocaleTimeString('id-ID')}</div>
            )}
          </div>

          <div className="sec-hdr" style={{ margin: '0 14px' }}><span className="sec-ttl">Riwayat terbaru</span></div>
          <div className="gm-list" style={{ margin: '8px 14px' }}>
            {recipients.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Belum ada email terkirim.</div>
            )}
            {recipients.map((r) => (
              <div key={r.id} className="log-row">
                <div className="log-ic" style={{
                  background: r.status === 'sent' ? 'var(--green-lt)' : r.status === 'failed' ? 'var(--red-lt)' : 'var(--amber-lt)',
                  color: r.status === 'sent' ? 'var(--green)' : r.status === 'failed' ? 'var(--red)' : 'var(--amber)',
                }}>
                  <i className={`ti ${r.status === 'sent' ? 'ti-check' : r.status === 'failed' ? 'ti-x' : 'ti-clock'}`} aria-hidden="true"></i>
                </div>
                <div className="log-info">
                  <div className="log-email">{r.email}</div>
                  <div className="log-meta">{r.error_message || `Batch ${r.batch_number}`}</div>
                </div>
                {r.sent_at && <span className="pill p-green">{new Date(r.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
