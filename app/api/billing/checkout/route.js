import { createClient } from '../../../../lib/supabase/server';
import { PLANS } from '../../../../lib/plans';
import midtransClient from 'midtrans-client';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await request.json();
  const planConfig = PLANS[plan];
  if (!planConfig || planConfig.priceMonthly === 0) {
    return NextResponse.json({ error: 'Paket tidak valid' }, { status: 400 });
  }

  const orderId = `WG-${user.id.slice(0, 8)}-${Date.now()}`;

  const { error: invErr } = await supabase.from('invoices').insert({
    user_id: user.id, plan, amount: planConfig.priceMonthly, status: 'pending', provider_ref: orderId,
  });
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });

  const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });

  try {
    const transaction = await snap.createTransaction({
      transaction_details: { order_id: orderId, gross_amount: planConfig.priceMonthly },
      customer_details: { email: user.email },
      item_details: [{ id: plan, price: planConfig.priceMonthly, quantity: 1, name: `WETAN GANG - ${planConfig.label} (1 bulan)` }],
      callbacks: { finish: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=selesai` },
    });

    return NextResponse.json({ redirectUrl: transaction.redirect_url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
