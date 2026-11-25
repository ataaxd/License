# Generic License Manager (Next.js + Vercel + Upstash Redis)

Template pengelolaan lisensi generik untuk aplikasi biasa. Tidak menyediakan distribusi payload atau kode aplikasi.

## Fitur
- Generate kode lisensi dengan prefix yang dapat diatur.
- Masa berlaku, catatan, dan batas perangkat.
- Aktivasi perangkat dicatat; perangkat yang sama dapat memeriksa ulang tanpa menambah hitungan.
- Aktivasi atomik menggunakan Redis Lua agar dua perangkat yang meminta bersamaan tidak melewati batas.
- Panel admin refresh otomatis setiap 5 detik dan layout responsif.
- Admin API dilindungi `ADMIN_API_KEY`.

## Deploy ke Vercel
1. Upload/import project ini ke repository GitHub milikmu.
2. Import repository ke Vercel.
3. Hubungkan Upstash Redis melalui Storage/Marketplace. Pastikan tersedia `KV_REST_API_URL` dan `KV_REST_API_TOKEN`.
4. Tambahkan `ADMIN_API_KEY` sebagai Environment Variable Vercel. Gunakan secret acak yang panjang.
5. Redeploy, lalu buka `/admin`.

## Endpoint
- `POST /api/license/generate` (admin; header `x-admin-key`)
- `GET /api/license/list` (admin; header `x-admin-key`)
- `POST /api/license/revoke` (admin; header `x-admin-key`)
- `POST /api/license/renew` (admin; header `x-admin-key`)
- `POST /api/license/activate` (public; body JSON `{ "key": "APP-...", "deviceId": "stable-device-id", "platform": "android" }`)

`deviceId` wajib dikirim. Jangan gunakan alamat IP sebagai ID perangkat. Aplikasi klien perlu membuat dan menyimpan ID perangkat acak yang stabil secara aman. Perangkat yang sama saat aktivasi ulang tidak menambah jumlah pemakaian. Perangkat berbeda ditolak ketika jumlah perangkat terdaftar mencapai batas.

## Catatan operasional
- Nilai `days: 0` berarti tanpa tanggal kedaluwarsa.
- Revoke mengubah status menjadi `revoked`; renew mengaktifkan kembali lisensi dan menambah hari dari waktu kedaluwarsa saat ini (atau sekarang jika sudah lewat).
- Daftar lisensi menggunakan `KEYS license:*`; untuk skala besar, ganti dengan indeks terkelola/SCAN dan pagination.
- Perangkat yang terdaftar tidak otomatis terhapus. Jika perlu reset perangkat, tambahkan alur reset yang diautentikasi admin.
- Jangan pernah menaruh `ADMIN_API_KEY` di aplikasi/browser client.
