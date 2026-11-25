# Sistem Lisensi Sendiri (Vercel + KV)

Backend lisensi milik sendiri untuk menggantikan `https://license.dungeoncraft.my.id/v1/license/activate`
di `lobby-license.js`.

## Fitur

- Generate kode lisensi acak, format `PREFIX-32HEX` (default `PBH-...`, cocok dengan regex
  `/^PBH-[0-9A-F]{32}$/` yang sudah ada di `lobby-license.js`)
- Aktivasi & verifikasi kode (`POST /api/license/activate`) — kontrak request/response-nya
  sama persis dengan API lama, jadi `lobby-license.js` tinggal diarahkan ke endpoint baru
  tanpa perlu diubah bagian lain
- **Pembatasan perangkat realtime** — kalau maks. 1 perangkat, cuma 1 perangkat yang lagi
  *aktif* yang boleh pakai kode itu; perangkat ke-2/ke-3 ditolak selama perangkat pertama masih
  aktif. Begitu perangkat pertama berhenti (tutup app/logout/sinyal hilang) dan tidak heartbeat
  lagi selama TTL sesi (default 5 menit, bisa diatur per kode lewat `sessionTtlMinutes`), slotnya
  otomatis lepas dan perangkat lain boleh pakai. Fitur ini aktif kalau client mengirim `deviceId`
  — lihat bagian "Pembatasan perangkat realtime (deviceId + heartbeat)" di bawah
- Kedaluwarsa otomatis (atur `expiresInDays` saat membuat kode)
- Cabut (`revoke`) dan perpanjang (`renew`) kode kapan saja
- Rate limit sederhana di endpoint aktivasi (maks 20 percobaan/10 menit per kode, anti tebak-tebak)
- Panel admin di `/admin` — generate, lihat daftar, cabut, perpanjang, dikunci dengan admin key

## Setup

1. **Buat project di Vercel**
   - Push folder ini ke repo GitHub lalu import di https://vercel.com/new, atau
   - Pakai Vercel CLI: `npm i -g vercel`, lalu jalankan `vercel` di dalam folder ini

2. **Tambahkan database Redis (lewat Upstash)**
   - Produk "Vercel KV" lama sudah dipensiunkan per akhir 2024 — sekarang pakai integrasi
     **Upstash for Redis** dari Vercel Marketplace, tapi env var dan cara kode ini
     membacanya tetap sama (`KV_REST_API_URL` / `KV_REST_API_TOKEN`)
   - Di dashboard project → tab **Storage** → cari/klik **Upstash** (atau **Browse Marketplace**
     kalau tidak langsung muncul) → **Install/Add Integration**
   - Login atau daftar akun Upstash (gratis) → pilih project Vercel kamu untuk dihubungkan
   - Buat database baru (atau pakai yang sudah ada) → hubungkan ke project ini
   - Env var `KV_REST_API_URL`, `KV_REST_API_TOKEN`, dll otomatis terisi ke project (lihat `.env.example`)

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

## Pembatasan perangkat realtime (deviceId + heartbeat)

Cara kerja lamanya: begitu sebuah perangkat aktivasi, dia "terikat" permanen ke kode itu —
device ke-2 baru bisa dipakai kalau sudah ada slot kosong, dan slot itu TIDAK PERNAH lepas
sendiri. Itu bukan realtime: perangkat pertama tetap menghabiskan slot walau sudah tidak
dipakai lagi (app ditutup, HP mati, dsb).

Sekarang mekanismenya berbasis **sesi + heartbeat**:

1. Tiap kali `deviceId` memanggil `/api/license/activate` dan `active: true`, server anggap
   perangkat itu "aktif sekarang" dan mencatat `lastSeenAt`.
2. Response sukses menyertakan `heartbeatIntervalSeconds` — client **wajib** memanggil ulang
   `/api/license/activate` dengan `key` + `deviceId` yang sama secara berkala (default sekitar
   tiap 100 detik untuk TTL 5 menit) selagi app masih dipakai, supaya slotnya tidak basi.
3. Server menghitung "berapa perangkat aktif sekarang" = perangkat yang heartbeat-nya masih
   dalam TTL sesi (`sessionTtlMinutes`, default 5 menit). Kalau jumlah itu sudah mencapai
   `maxActivations`, perangkat baru (deviceId belum pernah/activeSessions kosong) ditolak
   dengan `reason: "device_limit_reached"`.
4. Begitu perangkat yang sedang aktif berhenti heartbeat selama lebih dari TTL (app ditutup,
   device dimatikan, koneksi putus, dst.), dia otomatis dianggap tidak aktif lagi dan
   slotnya bebas dipakai perangkat lain — tanpa perlu admin cabut manual.
5. Opsional: panggil `/api/license/release` saat user logout/keluar supaya slot langsung
   lepas seketika, tidak perlu menunggu TTL habis.

> Catatan: ini "realtime" dalam arti status tiap perangkat dicek ulang secara berkala
> (polling tiap puluhan detik), bukan push instan via websocket. Untuk kasus lisensi seperti
> ini itu sudah cukup — kalau butuh "device lama langsung ke-logout detik itu juga" tanpa
> jeda sama sekali, itu perlu infrastruktur koneksi persisten (mis. websocket) yang jauh
> lebih kompleks dibanding setup Vercel + Redis ini.

### Integrasi ke lobby-license.js

Saat ini `lobby-license.js` kemungkinan hanya mengirim `{ key, platform }` sekali saat halaman
dibuka. Supaya pembatasan perangkat realtime di atas jalan, tambahkan:

- `deviceId` di body request (ID acak dibuat sekali, disimpan di `localStorage` supaya tetap
  sama tiap kali perangkat yang sama membuka halaman)
- loop heartbeat yang memanggil ulang `/api/license/activate` dengan `deviceId` yang sama,
  pakai interval dari `heartbeatIntervalSeconds` di response

Contoh lengkapnya ada di [`examples/device-heartbeat-snippet.js`](./examples/device-heartbeat-snippet.js)
— tinggal sesuaikan `API_BASE`-nya lalu gabungkan ke `lobby-license.js` menggantikan pemanggilan
`fetch` yang lama.

## Daftar endpoint

| Endpoint                     | Method | Auth            | Keterangan                       |
|-------------------------------|--------|------------------|-----------------------------------|
| `/api/license/activate`       | POST   | publik           | Verifikasi kode + heartbeat perangkat aktif |
| `/api/license/release`        | POST   | publik           | Lepas slot perangkat ini seketika (opsional, mis. saat logout) |
| `/api/license/generate`       | POST   | `x-admin-key`    | Membuat kode baru (bisa atur `maxActivations`, `sessionTtlMinutes`) |
| `/api/license/list`           | GET    | `x-admin-key`    | Daftar semua kode + perangkat yang aktif sekarang |
| `/api/license/revoke`         | POST   | `x-admin-key`    | Mencabut kode                     |
| `/api/license/renew`          | POST   | `x-admin-key`    | Perpanjang masa berlaku (opsional sekalian ubah `maxActivations`/`sessionTtlMinutes`) |

## Catatan keamanan

- Jangan pernah menaruh `ADMIN_API_KEY` di kode sisi client/browser — hanya dipakai saat kamu
  login ke panel `/admin` milik sendiri
- Endpoint `activate` memang sengaja publik karena dipanggil dari aplikasi Android/web;
  endpoint lainnya wajib header `x-admin-key`
