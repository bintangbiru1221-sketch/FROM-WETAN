'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import PhoneShell from '../components/PhoneShell';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('semua');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: campaigns } = await supabase.from('campaigns').select('id, name').eq('user_id', user.id);
      const campaignIds = (campaigns || []).map((c) => c.id);
      const campaignNameMap = Object.fromEntries((campaigns || []).map((c) => [c.id, c.name]));

      if (campaignIds.length === 0) { setLoading(false); return; }

      const { data: recipients } = await supabase
        .from('campaign_recipients').select('*').in('campaign_id', campaignIds)
        .order('sent_at', { ascending: false, nullsFirst: false }).limit(100);

      setLogs((recipients || []).map((r) => ({ ...r, campaignName: campaignNameMap[r.campaign_id] })));
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'semua' ? logs : logs.filter((l) => l.status === filter);

  const grouped = filtered.reduce((acc, l) => {
    const day = l.sent_at ? new Date(l.sent_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Belum terkirim';
    acc[day] = acc[day] || [];
    acc[day].push(l);
    return acc;
  }, {});

  const iconFor = { sent: 'ti-check', failed: 'ti-x', pending: 'ti-clock' };
  const colorFor = { sent: 'green', failed: 'red', pending: 'amber' };

  return (
    <PhoneShell>
      <div className="screen active" id="screen-logs">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/profile" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Logs pengiriman</div>
          </div>
        </div>
        <div className="chips">
          <div className={`chip ${filter === 'semua' ? 'on' : ''}`} onClick={() => setFilter('semua')}>Semua</div>
          <div className={`chip ${filter === 'sent' ? 'on' : ''}`} onClick={() => setFilter('sent')}>Terkirim</div>
          <div className={`chip ${filter === 'failed' ? 'on' : ''}`} onClick={() => setFilter('failed')}>Gagal</div>
          <div className={`chip ${filter === 'pending' ? 'on' : ''}`} onClick={() => setFilter('pending')}>Menunggu</div>
        </div>

        <div className="pscroll2" style={{ paddingTop: 0 }}>
          {loading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Memuat…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Belum ada riwayat pengiriman.</div>
          )}
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div className="log-date">{day}</div>
              <div className="gm-list" style={{ margin: '0 14px' }}>
                {items.map((l) => (
                  <div key={l.id} className="log-row">
                    <div className="log-ic" style={{ background: `var(--${colorFor[l.status]}-lt)`, color: `var(--${colorFor[l.status]})` }}>
                      <i className={`ti ${iconFor[l.status]}`} aria-hidden="true"></i>
                    </div>
                    <div className="log-info">
                      <div className="log-email">{l.email}</div>
                      <div className="log-meta">{l.campaignName}{l.error_message ? ` · ${l.error_message}` : ''}</div>
                    </div>
                    <span className={`pill p-${colorFor[l.status]}`}>
                      {l.sent_at ? new Date(l.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Antri'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
