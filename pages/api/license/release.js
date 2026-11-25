import kv from '../../../lib/kv';
import { isValidFormat } from '../../../lib/license';

// Endpoint opsional: dipanggil client saat logout/keluar supaya slot
// perangkatnya langsung lepas, tidak perlu menunggu sessionTtlMinutes habis.
// Kalau client tidak sempat memanggil ini (mis. app ditutup paksa / HP mati),
// slot tetap akan lepas sendiri setelah TTL lewat — ini cuma mempercepat saja.
const ALLOWED_ORIGIN = '*';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { key, deviceId } = req.body || {};
  const normalizedKey = (key || '').toUpperCase().trim();

  if (!isValidFormat(normalizedKey) || !deviceId) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const record = await kv.get(`license:${normalizedKey}`);
  if (!record) {
    return res.status(404).json({ error: 'invalid_key' });
  }

  const before = (record.activations || []).length;
  record.activations = (record.activations || []).filter((a) => a.deviceId !== deviceId);

  if (record.activations.length !== before) {
    await kv.set(`license:${normalizedKey}`, record);
  }

  return res.status(200).json({ released: true });
}
