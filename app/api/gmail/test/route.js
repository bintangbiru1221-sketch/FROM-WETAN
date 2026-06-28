import { createClient } from '../../../../lib/supabase/server';
import { testGmailConnection } from '../../../../lib/gmail';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gmailAccountId } = await request.json();
  const { data: account } = await supabase
    .from('gmail_accounts').select('*').eq('id', gmailAccountId).eq('user_id', user.id).single();

  if (!account) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });

  const result = await testGmailConnection(account.refresh_token_enc);

  await supabase.from('gmail_accounts').update({
    status: result.success ? 'active' : 'error',
    last_tested_at: new Date().toISOString(),
  }).eq('id', gmailAccountId);

  return NextResponse.json(result);
}
