import kv from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireAdmin(req, res)) return;

  const { key } = req.body || {};
  const record = await kv.get(`license:${key}`);
  if (!record) return res.status(404).json({ error: 'not_found' });

  record.status = 'revoked';
  await kv.set(`license:${key}`, record);

  return res.status(200).json({ license: record });
}
