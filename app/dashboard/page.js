import { createClient } from '../../lib/supabase/server';
import PhoneShell from '../components/PhoneShell';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { count: contactCount }, { data: gmailAccounts }, { data: campaigns }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('gmail_accounts').select('*').eq('user_id', user.id),
    supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const activeGmail = (gmailAccounts || []).filter((g) => g.status === 'active').length;
  const runningCampaigns = (campaigns || []).filter((c) => c.status === 'running');
  const completedCampaigns = (campaigns || []).filter((c) => c.status === 'completed').length;
  const totalSent = (campaigns || []).reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalPending = (campaigns || []).reduce(
    (sum, c) => sum + Math.max((c.total_recipients || 0) - (c.sent_count || 0) - (c.failed_count || 0), 0), 0
  );
  const liveCampaign = runningCampaigns[0];
  const livePct = liveCampaign && liveCampaign.total_recipients
    ? Math.round((liveCampaign.sent_count / liveCampaign.total_recipients) * 100)
    : 0;

  const initials = (profile?.full_name || user.email || '?')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const planLabel = { trial: 'Trial Plan', basic: 'Basic Plan', pro: 'Pro Plan' }[profile?.plan] || 'Trial Plan';
  const daysLeft = profile?.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(profile.plan_expires_at) - new Date()) / 86400000))
    : 0;

  const statusLabel = { running: 'Sending', draft: 'Draft', completed: 'Selesai', paused: 'Pause', failed: 'Gagal' };
  const statusPill = { running: 'p-blue', draft: 'p-gray', completed: 'p-green', paused: 'p-amber', failed: 'p-red' };

  return (
    <PhoneShell>
      <div className="screen active" id="screen-home">
        <div className="topnav">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="logo-box"><i className="ti ti-send" aria-hidden="true"></i></div>
            <span className="logo-name">WETAN GANG</span>
          </div>
          <div className="nav-bell"><i className="ti ti-bell" aria-hidden="true"></i><div className="bdot"></div></div>
        </div>
        <div className="cscroll">

          <div className="greet-hero">
            <div className="gh-top">
              <div>
                <div className="gh-name">Halo, {(profile?.full_name || user.email || '').split(' ')[0]} 👋</div>
                <div className="gh-sub">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} · {planLabel}</div>
              </div>
              <div className="av-white">{initials}</div>
            </div>
            <div className="gh-stats">
              <div className="gh-stat"><div className="ghs-val">{contactCount || 0}</div><div className="ghs-lbl">Kontak</div></div>
              <div className="gh-stat"><div className="ghs-val">{(gmailAccounts || []).length}</div><div className="ghs-lbl">Gmail</div></div>
              <div className="gh-stat"><div className="ghs-val">{completedCampaigns}</div><div className="ghs-lbl">Selesai</div></div>
            </div>
          </div>

          <div>
            <div className="sec-hdr"><span className="sec-ttl">Ringkasan</span></div>
            <div style={{ height: 8 }}></div>
            <div className="stats-2col">
              <div className="stat-tile s1">
                <div className="tile-ic"><i className="ti ti-speakerphone" aria-hidden="true"></i></div>
                <div className="tile-val">{runningCampaigns.length}</div>
                <div className="tile-lbl">Campaign berjalan</div>
              </div>
              <div className="stat-tile s2">
                <div className="tile-ic"><i className="ti ti-circle-check" aria-hidden="true"></i></div>
                <div className="tile-val">{totalSent}</div>
                <div className="tile-lbl">Email terkirim</div>
              </div>
              <div className="stat-tile s3">
                <div className="tile-ic"><i className="ti ti-clock" aria-hidden="true"></i></div>
                <div className="tile-val">{totalPending}</div>
                <div className="tile-lbl">Menunggu kirim</div>
              </div>
              <div className="stat-tile s4">
                <div className="tile-ic"><i className="ti ti-mail-check" aria-hidden="true"></i></div>
                <div className="tile-val">{activeGmail}</div>
                <div className="tile-lbl">Gmail aktif</div>
              </div>
            </div>
          </div>

          {liveCampaign && (
            <div>
              <div className="sec-hdr"><span className="sec-ttl">Sedang berjalan</span>
                <Link href={`/campaign/${liveCampaign.id}`} className="sec-lnk">Detail</Link>
              </div>
              <div style={{ height: 8 }}></div>
              <div className="live-card">
                <div className="live-top">
                  <div className="live-pulse"></div>
                  <div className="live-title">{liveCampaign.name}</div>
                </div>
                <div className="live-stats-row">
                  <div className="live-stat"><div className="ls-val">{liveCampaign.total_recipients}</div><div className="ls-lbl">Total</div></div>
                  <div className="live-stat"><div className="ls-val">{liveCampaign.sent_count}</div><div className="ls-lbl">Kirim</div></div>
                  <div className="live-stat"><div className="ls-val">{Math.max(liveCampaign.total_recipients - liveCampaign.sent_count - liveCampaign.failed_count, 0)}</div><div className="ls-lbl">Tunggu</div></div>
                  <div className="live-stat"><div className="ls-val">{liveCampaign.failed_count}</div><div className="ls-lbl">Gagal</div></div>
                </div>
                <div className="live-progress"><div className="lp-bar" style={{ width: `${livePct}%` }}></div></div>
                <div className="live-foot">{livePct}% selesai</div>
              </div>
            </div>
          )}

          <div>
            <div className="sec-hdr"><span className="sec-ttl">Campaign terbaru</span>
              <Link href="/logs" className="sec-lnk">Semua</Link>
            </div>
            <div style={{ height: 8 }}></div>
            <div className="camp-list">
              {(campaigns || []).length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12.5 }}>
                  Belum ada campaign. <Link href="/campaign" style={{ color: 'var(--blue)' }}>Buat sekarang</Link>
                </div>
              )}
              {(campaigns || []).map((c) => {
                const pct = c.total_recipients ? Math.round((c.sent_count / c.total_recipients) * 100) : 0;
                return (
                  <Link href={`/campaign/${c.id}`} key={c.id} className="camp-row">
                    <div className="camp-dot" style={{ background: 'var(--blue)' }}></div>
                    <div className="camp-ic ci-blue"><i className="ti ti-speakerphone" aria-hidden="true"></i></div>
                    <div className="camp-info">
                      <div className="camp-name">{c.name}</div>
                      <div className="camp-meta">{c.total_recipients} kontak · {c.batch_size} email/{c.interval_minutes} mnt</div>
                      {c.status === 'running' && <div className="mini-prog"><div className="mini-bar" style={{ width: `${pct}%`, background: 'var(--blue)' }}></div></div>}
                    </div>
                    <span className={`pill ${statusPill[c.status] || 'p-gray'}`}>{statusLabel[c.status] || c.status}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="plan-strip">
            <div style={{ flex: 1 }}>
              <div className="ps-lbl">Paket aktif</div>
              <div className="ps-name">{planLabel}</div>
              <div className="ps-exp">{profile?.plan_expires_at ? `Berakhir ${new Date(profile.plan_expires_at).toLocaleDateString('id-ID')}` : '—'}</div>
            </div>
            <div className="ps-days">
              <div className="pd-num">{daysLeft}</div>
              <div className="pd-lbl">hari tersisa</div>
            </div>
          </div>

        </div>
        <BottomNav active="/dashboard" />
      </div>
    </PhoneShell>
  );
}
