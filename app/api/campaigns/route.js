import { createClient } from '../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, subject, bodyHtml, senderMode, gmailAccountId, batchSize, intervalMinutes } = body;

  // Cek subscription aktif
  const { data: profile } = await supabase.from('profiles').select('plan_expires_at').eq('id', user.id).single();
  if (!profile?.plan_expires_at || new Date(profile.plan_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Paket Anda sudah habis. Perpanjang dulu di halaman Billing.' }, { status: 403 });
  }

  const { data: contacts } = await supabase.from('contacts').select('id, name, email').eq('user_id', user.id);
  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: 'Belum ada kontak. Tambahkan kontak dulu.' }, { status: 400 });
  }

  const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
    user_id: user.id,
    name, subject, body_html: bodyHtml,
    sender_mode: senderMode,
    gmail_account_id: senderMode === 'single' ? gmailAccountId : null,
    batch_size: batchSize,
    interval_minutes: intervalMinutes,
    total_recipients: contacts.length,
    status: 'running',
    next_batch_at: new Date().toISOString(), // batch pertama langsung dikirim saat cron berikutnya jalan
    started_at: new Date().toISOString(),
  }).select().single();

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 400 });

  const recipients = contacts.map((c, idx) => ({
    campaign_id: campaign.id,
    contact_id: c.id,
    email: c.email,
    name: c.name,
    batch_number: Math.floor(idx / batchSize) + 1,
    status: 'pending',
  }));

  const { error: recErr } = await supabase.from('campaign_recipients').insert(recipients);
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 400 });

  return NextResponse.json({ success: true, campaignId: campaign.id });
}
