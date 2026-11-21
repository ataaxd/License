# Sistem Lisensi Sendiri (Vercel + KV)

Backend lisensi milik sendiri untuk menggantikan `https://license.dungeoncraft.my.id/v1/license/activate`
di `lobby-license.js`.

## Fitur

- Generate kode lisensi acak, format `PREFIX-32HEX` (default `PBH-...`, cocok dengan regex
  `/^PBH-[0-9A-F]{32}$/` yang sudah ada di `lobby-license.js`)
- Aktivasi & verifikasi kode (`POST /api/license/activate`) — kontrak request/response-nya
  sama persis dengan API lama, jadi `lobby-license.js` tinggal diarahkan ke endpoint baru
  tanpa perlu diubah bagian lain
- Pembatasan jumlah perangkat per kode (opsional — aktif kalau client mengirim `deviceId`)
- Kedaluwarsa otomatis (atur `expiresInDays` saat membuat kode)
- Cabut (`revoke`) dan perpanjang (`renew`) kode kapan saja
- Rate limit sederhana di endpoint aktivasi (maks 20 percobaan/10 menit per kode, anti tebak-tebak)
- Panel admin di `/admin` — generate, lihat daftar, cabut, perpanjang, dikunci dengan admin key

## Setup

1. **Buat project di Vercel**
   - Push folder ini ke repo GitHub lalu import di https://vercel.com/new, atau
   - Pakai Vercel CLI: `npm i -g vercel`, lalu jalankan `vercel` di dalam folder ini

2. **Tambahkan Vercel KV**
   - Di dashboard project → tab **Storage** → **Create Database** → pilih **KV**
   - Hubungkan ke project ini — Vercel otomatis mengisi env var `KV_REST_API_URL`,
     `KV_REST_API_TOKEN`, dll (lihat `.env.example`)

3. **Set `ADMIN_API_KEY`**
   - Di tab **Settings → Environment Variables**, tambahkan `ADMIN_API_KEY`
   - Isi dengan string acak yang panjang, contoh cara generate: `openssl rand -hex 32`

4. **Deploy ulang** supaya env var terbaru terbaca (`vercel --prod` atau tombol redeploy di dashboard)

5. **Buka `https://domain-kamu.vercel.app/admin`**, masukkan `ADMIN_API_KEY` yang tadi dibuat,
   lalu mulai generate kode

## Menghubungkan ke lobby-license.js

Di `lobby-license.js`, ganti baris endpoint:

```js
const api = 'https://license.dungeoncraft.my.id/v1/license/activate';
```

menjadi domain Vercel kamu sendiri, misalnya:

```js
const api = 'https://domain-kamu.vercel.app/api/license/activate';
```

Format request dan response yang dikirim/diterima script itu sudah sama persis dengan yang
dipakai server ini, jadi tidak ada bagian lain yang perlu diubah.

## Opsional: kirim deviceId dari client

Saat ini `lobby-license.js` hanya mengirim `{ key, platform }`. Kalau mau fitur pembatasan
jumlah perangkat per kode benar-benar aktif, tambahkan `deviceId` di body request-nya —
misalnya ID acak yang dibuat sekali lalu disimpan di `localStorage`.

## Daftar endpoint

| Endpoint                     | Method | Auth            | Keterangan                       |
|-------------------------------|--------|------------------|-----------------------------------|
| `/api/license/activate`       | POST   | publik           | Dipanggil dari aplikasi/client    |
| `/api/license/generate`       | POST   | `x-admin-key`    | Membuat kode baru                 |
| `/api/license/list`           | GET    | `x-admin-key`    | Daftar semua kode                 |
| `/api/license/revoke`         | POST   | `x-admin-key`    | Mencabut kode                     |
| `/api/license/renew`          | POST   | `x-admin-key`    | Memperpanjang masa berlaku kode   |

## Catatan keamanan

- Jangan pernah menaruh `ADMIN_API_KEY` di kode sisi client/browser — hanya dipakai saat kamu
  login ke panel `/admin` milik sendiri
- Endpoint `activate` memang sengaja publik karena dipanggil dari aplikasi Android/web;
  endpoint lainnya wajib header `x-admin-key`
