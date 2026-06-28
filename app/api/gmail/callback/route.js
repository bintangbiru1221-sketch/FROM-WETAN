import { createClient } from '../../../../lib/supabase/server';
import { getGmailOAuthClient } from '../../../../lib/gmail';
import { encrypt } from '../../../../lib/encryption';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/sender?error=ditolak`);
  }

  try {
    const oauth2Client = getGmailOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Google tidak selalu kasih refresh_token kalau user sudah pernah consent sebelumnya.
      // Karena kita pakai prompt:'consent' di getGmailAuthUrl, ini seharusnya jarang terjadi.
      return NextResponse.redirect(`${origin}/sender?error=no_refresh_token`);
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const supabase = createClient();
    const refresh_token_enc = encrypt(tokens.refresh_token);

    const { error: dbError } = await supabase.from('gmail_accounts').upsert({
      user_id: userId,
      email: profile.email,
      refresh_token_enc,
      status: 'active',
      last_tested_at: new Date().toISOString(),
    }, { onConflict: 'user_id,email' });

    if (dbError) {
      return NextResponse.redirect(`${origin}/sender?error=${encodeURIComponent(dbError.message)}`);
    }

    return NextResponse.redirect(`${origin}/sender?connected=${encodeURIComponent(profile.email)}`);
  } catch (err) {
    return NextResponse.redirect(`${origin}/sender?error=${encodeURIComponent(err.message)}`);
  }
}
