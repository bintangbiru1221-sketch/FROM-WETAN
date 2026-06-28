import { google } from 'googleapis';
import { decrypt } from './encryption';

// OAuth client khusus untuk izin akses Gmail (scope gmail.send)
// Beda dari OAuth login Supabase — ini dipakai SETELAH user login,
// untuk meminta izin tambahan agar app bisa kirim email atas nama Gmail mereka.
export function getGmailOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  );
}

export function getGmailAuthUrl(state) {
  const oauth2Client = getGmailOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',      // wajib, supaya dapat refresh_token
    prompt: 'consent',           // wajib, supaya refresh_token selalu dikirim ulang
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly', // Tambah ini untuk test koneksi
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}

// Encode subject ke MIME header agar emoji/karakter unicode aman dikirim
function encodeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

function buildRawMessage({ to, fromEmail, subject, html }) {
  const message = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Kirim 1 email sungguhan lewat Gmail API, memakai refresh_token akun yang dipilih.
// Mengembalikan { success: true } atau { success: false, error }
export async function sendGmailMessage({ refreshTokenEnc, fromEmail, to, subject, html }) {
  try {
    const refreshToken = decrypt(refreshTokenEnc);
    const oauth2Client = getGmailOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const raw = buildRawMessage({ to, fromEmail, subject, html });

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Gagal mengirim email' };
  }
}

// Tes koneksi: cukup ambil profile Gmail untuk pastikan refresh_token masih valid
export async function testGmailConnection(refreshTokenEnc) {
  try {
    const refreshToken = decrypt(refreshTokenEnc);
    const oauth2Client = getGmailOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.getProfile({ userId: 'me' });
    return { success: true, email: res.data.emailAddress };
  } catch (err) {
    return { success: false, error: err.message || 'Koneksi gagal' };
  }
}
