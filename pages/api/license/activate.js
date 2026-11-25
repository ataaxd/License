import kv from '../../../lib/kv';
import { isValidFormat, DEFAULT_SESSION_TTL_MINUTES, MINUTE_MS } from '../../../lib/license';

// Endpoint ini dipanggil dari domain lain (halaman lobby/web/app), jadi butuh izin CORS.
// Ganti '*' dengan domain spesifik (mis. 'https://dungeoncraft.my.id') kalau mau lebih ketat.
const ALLOWED_ORIGIN = '*';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  // Browser mengirim OPTIONS dulu sebagai "izin" sebelum POST sungguhan (preflight).
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ active: false, error: 'method_not_allowed' });
  }

  const { key, platform, deviceId } = req.body || {};
  const normalizedKey = (key || '').toUpperCase().trim();

  if (!isValidFormat(normalizedKey)) {
    return res.status(400).json({ active: false, error: 'invalid_key' });
  }

  // Rate limit sederhana per kode: maks 20 percobaan / 10 menit, anti brute-force.
  const rlKey = `ratelimit:${normalizedKey}`;
  const attempts = await kv.incr(rlKey);
  if (attempts === 1) await kv.expire(rlKey, 600);
  if (attempts > 20) {
    return res.status(429).json({ active: false, reason: 'too_many_attempts' });
  }

  const record = await kv.get(`license:${normalizedKey}`);
  if (!record) {
    return res.status(404).json({ active: false, error: 'invalid_key' });
  }

  if (record.status === 'revoked') {
    return res.status(403).json({ active: false, reason: 'revoked' });
  }

  if (record.expiresAt && Date.now() > record.expiresAt) {
    if (record.status !== 'expired') {
      record.status = 'expired';
      await kv.set(`license:${normalizedKey}`, record);
    }
    return res.status(403).json({ active: false, reason: 'expired' });
  }

  const now = Date.now();

  // TTL sesi: berapa lama perangkat dianggap "masih aktif" sejak heartbeat
  // (panggilan activate) terakhirnya. Lewat dari ini tanpa heartbeat baru,
  // slotnya otomatis lepas dan boleh dipakai perangkat lain — ini yang bikin
  // pembatasan perangkat jadi realtime, bukan binding permanen.
  const ttlMs =
    (record.sessionTtlMinutes ? Number(record.sessionTtlMinutes) : DEFAULT_SESSION_TTL_MINUTES) *
    MINUTE_MS;

  // Buang sesi yang sudah basi (tidak heartbeat dalam ttlMs terakhir) —
  // dengan ini record.activations selalu berisi perangkat yang BENAR-BENAR
  // aktif saat ini, bukan riwayat semua perangkat yang pernah aktivasi.
  const activeSessions = (record.activations || []).filter(
    (a) => now - (a.lastSeenAt || a.activatedAt || 0) <= ttlMs
  );

  if (!deviceId) {
    // Tanpa deviceId, batas perangkat realtime tidak bisa ditegakkan untuk
    // request ini (tidak tahu ini "siapa") — tetap verifikasi kode seperti
    // biasa, tapi sekalian bersihkan sesi basi punya perangkat lain.
    record.activations = activeSessions;
    record.lastCheckedAt = now;
    await kv.set(`license:${normalizedKey}`, record);
    return res.status(200).json({ active: true });
  }

  const existing = activeSessions.find((a) => a.deviceId === deviceId);

  if (existing) {
    // Heartbeat dari perangkat yang memang sedang aktif: perpanjang sesinya.
    existing.lastSeenAt = now;
    existing.platform = platform || existing.platform || 'unknown';
  } else if (activeSessions.length >= record.maxActivations) {
    // Slot penuh oleh perangkat lain yang sedang aktif SAAT INI.
    record.activations = activeSessions;
    record.lastCheckedAt = now;
    await kv.set(`license:${normalizedKey}`, record);
    return res.status(403).json({
      active: false,
      reason: 'device_limit_reached',
      activeDevices: activeSessions.length,
      maxActivations: record.maxActivations,
    });
  } else {
    // Ada slot kosong (device lain sudah lewat TTL atau belum sepenuhnya terpakai).
    activeSessions.push({
      deviceId,
      platform: platform || 'unknown',
      activatedAt: now,
      lastSeenAt: now,
    });
  }

  record.activations = activeSessions;
  record.lastCheckedAt = now;
  await kv.set(`license:${normalizedKey}`, record);

  return res.status(200).json({
    active: true,
    // Saran ke client: seberapa sering harus kirim ulang request ini supaya
    // slotnya tidak dianggap basi (kira-kira TTL/3, minimal 20 detik).
    heartbeatIntervalSeconds: Math.max(20, Math.floor(ttlMs / 3 / 1000)),
  });
}
