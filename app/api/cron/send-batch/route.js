import { createAdminClient } from '../../../../lib/supabase/server';
import { sendGmailMessage } from '../../../../lib/gmail';
import { NextResponse } from 'next/server';

// Endpoint ini dipanggil terjadwal (Vercel Cron / cron-job.org / Upstash QStash)
// setiap beberapa menit. Tugasnya: cari semua campaign yang next_batch_at <= sekarang,
// kirim 1 batch (sejumlah batch_size) lewat Gmail API, lalu jadwalkan batch berikutnya.
//
// Dilindungi CRON_SECRET supaya tidak bisa dipanggil sembarang orang.

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: dueCampaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'running')
    .lte('next_batch_at', now);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!dueCampaigns || dueCampaigns.length === 0) {
    return NextResponse.json({ processed: 0, message: 'Tidak ada campaign yang due.' });
  }

  const results = [];

  for (const campaign of dueCampaigns) {
    results.push(await processOneCampaignBatch(supabase, campaign));
  }

  return NextResponse.json({ processed: results.length, results });
}

async function processOneCampaignBatch(supabase, campaign) {
  // Ambil 1 batch berikutnya yang masih pending
  const currentBatchNumber = Math.floor(campaign.sent_count / campaign.batch_size) + 1;

  const { data: batchRecipients } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .eq('batch_number', currentBatchNumber)
    .limit(campaign.batch_size);

  if (!batchRecipients || batchRecipients.length === 0) {
    // Tidak ada lagi yang pending -> campaign selesai
    await supabase.from('campaigns').update({
      status: 'completed', next_batch_at: null, completed_at: new Date().toISOString(),
    }).eq('id', campaign.id);
    return { campaignId: campaign.id, status: 'completed' };
  }

  // Tentukan akun Gmail pengirim untuk batch ini
  let senderAccounts = [];
  if (campaign.sender_mode === 'auto_rotate') {
    const { data: accounts } = await supabase
      .from('gmail_accounts').select('*').eq('user_id', campaign.user_id).eq('status', 'active');
    senderAccounts = accounts || [];
  } else {
    const { data: account } = await supabase
      .from('gmail_accounts').select('*').eq('id', campaign.gmail_account_id).single();
    senderAccounts = account ? [account] : [];
  }

  if (senderAccounts.length === 0) {
    await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
    return { campaignId: campaign.id, status: 'failed', reason: 'Tidak ada akun Gmail aktif' };
  }

  let sentInBatch = 0;
  let failedInBatch = 0;

  for (let i = 0; i < batchRecipients.length; i++) {
    const recipient = batchRecipients[i];
    // Auto Rotate: bagi rata round-robin antar akun yang tersedia
    const sender = senderAccounts[i % senderAccounts.length];

    const personalizedHtml = (campaign.body_html || '').replace(/\{\{\s*nama\s*\}\}/gi, recipient.name || 'Pelanggan');

    const result = await sendGmailMessage({
      refreshTokenEnc: sender.refresh_token_enc,
      fromEmail: sender.email,
      to: recipient.email,
      subject: campaign.subject,
      html: personalizedHtml,
    });

    if (result.success) {
      sentInBatch++;
      await supabase.from('campaign_recipients').update({
        status: 'sent', gmail_account_id: sender.id, sent_at: new Date().toISOString(),
      }).eq('id', recipient.id);
    } else {
      failedInBatch++;
      await supabase.from('campaign_recipients').update({
        status: 'failed', gmail_account_id: sender.id, error_message: result.error,
      }).eq('id', recipient.id);
    }
  }

  const newSentCount = campaign.sent_count + sentInBatch;
  const newFailedCount = campaign.failed_count + failedInBatch;
  const isLastBatch = newSentCount + newFailedCount >= campaign.total_recipients;

  await supabase.from('campaigns').update({
    sent_count: newSentCount,
    failed_count: newFailedCount,
    status: isLastBatch ? 'completed' : 'running',
    next_batch_at: isLastBatch ? null : new Date(Date.now() + campaign.interval_minutes * 60000).toISOString(),
    completed_at: isLastBatch ? new Date().toISOString() : null,
  }).eq('id', campaign.id);

  return { campaignId: campaign.id, sent: sentInBatch, failed: failedInBatch, status: isLastBatch ? 'completed' : 'running' };
}
