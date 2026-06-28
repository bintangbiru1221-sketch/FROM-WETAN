import { createAdminClient } from '../../../../lib/supabase/server';
import midtransClient from 'midtrans-client';
import { NextResponse } from 'next/server';

// Midtrans akan POST ke sini setiap ada perubahan status pembayaran.
// Daftarkan URL ini di: Midtrans Dashboard > Settings > Configuration > Notification URL
//   https://NAMA-DOMAIN-ANDA.vercel.app/api/billing/webhook

export async function POST(request) {
  const body = await request.json();
  const supabase = createAdminClient();

  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });

  // Verifikasi status transaksi langsung ke Midtrans (jangan percaya body mentah)
  const statusResponse = await core.transaction.notification(body);
  const { order_id, transaction_status, fraud_status } = statusResponse;

  const { data: invoice } = await supabase.from('invoices').select('*').eq('provider_ref', order_id).single();
  if (!invoice) return NextResponse.json({ received: true });

  const isPaid = transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept');
  const isFailed = ['deny', 'cancel', 'expire'].includes(transaction_status);

  if (isPaid && invoice.status !== 'paid') {
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoice.id);

    const { data: profile } = await supabase.from('profiles').select('plan_expires_at').eq('id', invoice.user_id).single();
    const base = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date()
      ? new Date(profile.plan_expires_at) : new Date();
    const newExpiry = new Date(base.getTime() + 30 * 86400000); // tambah 30 hari

    await supabase.from('profiles').update({ plan: invoice.plan, plan_expires_at: newExpiry.toISOString() }).eq('id', invoice.user_id);
  } else if (isFailed) {
    await supabase.from('invoices').update({ status: 'failed' }).eq('id', invoice.id);
  }

  return NextResponse.json({ received: true });
}
