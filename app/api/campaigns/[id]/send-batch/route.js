import { createClient, createAdminClient } from '../../../../lib/supabase/server';
import { sendGmailMessage } from '../../../../lib/gmail';
import { NextResponse } from 'next/server';

// Endpoint manual untuk trigger pengiriman 1 batch campaign (untuk testing atau tanpa cron)
export async function POST(request) {
  const supabaseUser = createClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { campaignId } = body;

  const supabaseAdmin = createAdminClient();
  
  // Cek apakah campaign ini milik user
  const { data: campaign } = await supabaseAdmin.from('campaigns').select('*').eq('id', campaignId).eq('user_id', user.id).single();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  
  // Proses 1 batch
  const result = await processOneCampaignBatch(supabaseAdmin, campaign);
  return NextResponse.json({ success: true, result });
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
