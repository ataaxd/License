import kv from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireAdmin(req, res)) return;

  const keys = await kv.smembers('license:all');
  const records = keys.length ? await Promise.all(keys.map((k) => kv.get(`license:${k}`))) : [];
  records.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

  return res.status(200).json({ licenses: records.filter(Boolean) });
}
