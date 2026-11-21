import kv from '../../../lib/kv';
import { generateLicenseKey, DAY_MS } from '../../../lib/license';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!requireAdmin(req, res)) return;

  const { prefix, expiresInDays, maxActivations, note } = req.body || {};

  let key;
  let tries = 0;
  do {
    key = generateLicenseKey(prefix);
    tries += 1;
  } while ((await kv.exists(`license:${key}`)) && tries < 5);

  const now = Date.now();
  const record = {
    key,
    status: 'active',
    createdAt: now,
    expiresAt: expiresInDays ? now + Number(expiresInDays) * DAY_MS : null,
    maxActivations: maxActivations ? Number(maxActivations) : 1,
    activations: [],
    note: note || '',
  };

  await kv.set(`license:${key}`, record);
  await kv.sadd('license:all', key);

  return res.status(200).json({ license: record });
}
