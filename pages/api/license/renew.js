import kv from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';
import { DAY_MS } from '../../../lib/license';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireAdmin(req, res)) return;

  const { key, addDays, reactivate, maxActivations, sessionTtlMinutes } = req.body || {};
  const record = await kv.get(`license:${key}`);
  if (!record) return res.status(404).json({ error: 'not_found' });

  const base = record.expiresAt && record.expiresAt > Date.now() ? record.expiresAt : Date.now();
  record.expiresAt = base + Number(addDays || 30) * DAY_MS;
  if (reactivate !== false) record.status = 'active';

  // Opsional: sekalian ubah batas perangkat & TTL sesi realtime-nya kalau dikirim.
  if (maxActivations) record.maxActivations = Number(maxActivations);
  if (sessionTtlMinutes !== undefined) {
    record.sessionTtlMinutes = sessionTtlMinutes ? Number(sessionTtlMinutes) : null;
  }

  await kv.set(`license:${key}`, record);

  return res.status(200).json({ license: record });
}
