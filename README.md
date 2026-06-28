# WETAN GANG — Aplikasi Web (Next.js + Supabase)

Ini versi **aplikasi nyata**, bukan prototipe lagi: login Google sungguhan, data
tersimpan di database, email benar-benar terkirim lewat Gmail API, dan billing
terhubung ke payment gateway (Midtrans).

Karena ini aplikasi nyata, ada beberapa hal yang **wajib Anda siapkan sendiri**
(akun & API key milik Anda) — Claude tidak bisa membuatkan ini untuk Anda.

---

## 0. Yang perlu disiapkan dulu

| Kebutuhan | Untuk apa | Link |
|---|---|---|
| Akun Supabase (gratis) | Database + Auth | https://supabase.com |
| Google Cloud Project | Login Google + akses Gmail API | https://console.cloud.google.com |
| Akun Midtrans (mode Sandbox dulu) | Payment billing | https://midtrans.com |
| Akun Vercel | Hosting | https://vercel.com |

---

## 1. Setup Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor** → New query → copy-paste seluruh isi file `supabase/schema.sql` → Run.
   Ini akan membuat semua tabel (profiles, contacts, campaigns, dll) + Row Level Security
   sehingga data tiap user otomatis terpisah.
3. Buka **Authentication → Providers → Google** → aktifkan.
   Anda akan diminta Client ID & Client Secret Google (lihat langkah 2 di bawah,
   isi balik ke sini setelah dapat).
4. Catat 3 nilai ini dari **Project Settings → API**:
   - `Project URL` → jadi `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → jadi `SUPABASE_SERVICE_ROLE_KEY` (⚠️ rahasia, jangan bocor)

## 2. Setup Google Cloud (OAuth + Gmail API)

1. Buat project baru di [Google Cloud Console](https://console.cloud.google.com).
2. **APIs & Services → Library** → cari "Gmail API" → Enable.
3. **APIs & Services → OAuth consent screen**:
   - User type: External
   - Scopes: tambahkan `gmail.send` dan `userinfo.email`
   - Selama masih "Testing", hanya email yang Anda daftarkan di "Test users" yang bisa connect Gmail.
     Untuk publik, perlu submit verifikasi ke Google (proses ini bisa beberapa hari/minggu).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: Web application
   - Authorized redirect URIs, tambahkan **keduanya**:
     - `https://<project-anda>.supabase.co/auth/v1/callback` (dipakai Supabase untuk login)
     - `https://<domain-vercel-anda>.vercel.app/api/gmail/callback` (dipakai app untuk connect Gmail)
   - Untuk testing lokal tambahkan juga `http://localhost:3000/api/gmail/callback`
5. Copy **Client ID** dan **Client Secret** → isi ke `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
   di `.env.local`, **dan** paste juga ke Supabase di langkah 1.3.

> Catatan penting: Login (lewat Supabase) dan koneksi Gmail (lewat `/api/gmail/connect`)
> memakai **OAuth Client yang sama** tapi scope berbeda. Itu sengaja — supaya 1 Google
> Cloud project saja sudah cukup.

## 3. Setup Midtrans (billing)

1. Daftar akun Midtrans, mulai dari mode **Sandbox**.
2. **Settings → Access Keys** → copy Server Key & Client Key → isi ke `.env.local`.
3. **Settings → Configuration → Payment Notification URL**, isi:
   `https://<domain-vercel-anda>.vercel.app/api/billing/webhook`
4. Kalau sudah siap terima uang sungguhan, ajukan akun Production lalu ganti
   `MIDTRANS_IS_PRODUCTION=true` + ganti key ke yang Production.

## 4. Jalankan di komputer lokal

```bash
npm install
cp .env.example .env.local
# isi semua nilai di .env.local sesuai langkah 1-3 di atas
npm run dev
```

Buka `http://localhost:3000` — akan redirect ke halaman login Google.

## 5. Deploy ke Vercel

1. Push folder ini ke repo GitHub.
2. Di Vercel: **Add New → Project → Import** repo tersebut.
3. Di **Settings → Environment Variables**, masukkan SEMUA variabel dari `.env.local`
   (kecuali ganti `NEXT_PUBLIC_APP_URL` jadi domain Vercel Anda).
4. Deploy.
5. **Penting — soal Cron Job batch sending:**
   - File `vercel.json` di sini sudah set cron `/api/cron/send-batch` tiap 5 menit.
   - **Tapi** di paket **Vercel Hobby (gratis), Cron Job dibatasi hanya bisa jalan
     beberapa kali per hari**, bukan tiap 5 menit. Untuk batch sending bertahap
     yang presisi (5–120 menit sesuai pilihan user), Anda butuh salah satu:
     - Upgrade ke **Vercel Pro**, atau
     - Pakai scheduler eksternal gratis seperti **cron-job.org** atau
       **Upstash QStash**, yang memanggil
       `https://domain-anda.vercel.app/api/cron/send-batch`
       dengan header `Authorization: Bearer <CRON_SECRET>` setiap 1–5 menit.

## 6. Hal yang masih perlu dikembangkan lebih lanjut

Supaya jujur soal scope — beberapa bagian di starter ini masih versi dasar:

- **Notifikasi** (toggle di Settings) baru UI saja, belum terhubung ke sistem
  email/push notification sungguhan — perlu ditambah (misal pakai Resend/Postmark).
- **Hapus akun** di Settings baru placeholder — perlu dibuatkan API route
  yang memanggil `supabase.auth.admin.deleteUser()` memakai service role key.
- **Auto Rotate** Gmail sudah jalan (round-robin antar akun aktif), tapi
  belum ada smart logic seperti distribusi berdasarkan rate-limit/kuota.
- **OAuth consent Google masih "Testing"** secara default — kalau mau dipakai
  publik luas, perlu proses verifikasi App Google (terutama karena scope
  `gmail.send` termasuk "sensitive scope").
- Rate limit Gmail API: akun Gmail biasa dibatasi ~500 email/hari oleh Google
  sendiri — ini di luar kendali aplikasi, perlu diinfokan ke user.

## Struktur folder

```
app/
├── login/              → halaman login Google
├── auth/callback/       → terima session setelah login
├── dashboard/            → data asli: jumlah kontak, gmail, campaign
├── contacts/              → CRUD + import CSV ke tabel `contacts`
├── campaign/               → buat campaign baru + estimasi batch
├── campaign/[id]/            → monitor real-time 1 campaign
├── sender/                     → connect/test/disconnect Gmail OAuth
├── templates/, logs/, billing/, profile/, settings/
├── api/gmail/                   → OAuth flow + test koneksi Gmail
├── api/campaigns/                 → bikin campaign + daftar recipient
├── api/cron/send-batch/             → JANTUNG aplikasi: kirim batch via Gmail API
├── api/billing/                       → checkout & webhook Midtrans
└── styles/                              → CSS dari versi prototype sebelumnya

lib/
├── supabase/        → koneksi database (browser & server)
├── gmail.js          → kirim email asli via Gmail API
├── encryption.js       → enkripsi refresh token Gmail sebelum disimpan
└── plans.js              → batas tiap paket (trial/basic/pro)

supabase/schema.sql   → seluruh struktur database + Row Level Security
```


