import kv from '../../../lib/kv';
import { isValidFormat } from '../../../lib/license';

export default async function handler(req, res) {
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

  if (deviceId) {
    const alreadyBound = record.activations.some((a) => a.deviceId === deviceId);
    if (!alreadyBound) {
      if (record.activations.length >= record.maxActivations) {
        return res.status(403).json({ active: false, reason: 'device_limit_reached' });
      }
      record.activations.push({
        deviceId,
        platform: platform || 'unknown',
        activatedAt: Date.now(),
      });
    }
  }

  record.lastCheckedAt = Date.now();
  await kv.set(`license:${normalizedKey}`, record);

  return res.status(200).json({ active: true });
}
