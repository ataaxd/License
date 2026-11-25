import redis from '../../../lib/kv';
import { validKey } from '../../../lib/license';

// Atomic activation: simultaneous requests cannot exceed maxDevices.
const ACTIVATE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return { 'missing' } end
local rec = cjson.decode(raw)
local now = tonumber(ARGV[3])
if rec.status == 'revoked' then return { 'revoked' } end
if rec.expiresAt and tonumber(rec.expiresAt) > 0 and now > tonumber(rec.expiresAt) then
  rec.status = 'expired'; redis.call('SET', KEYS[1], cjson.encode(rec)); return { 'expired' }
end
local device = ARGV[1]
local platform = ARGV[2]
if not device or device == '' then return { 'device_required' } end
local found = false
for _, item in ipairs(rec.devices or {}) do
  if item.deviceId == device then found = true; item.lastSeenAt = now end
end
if not found then
  local count = #(rec.devices or {})
  if count >= tonumber(rec.maxDevices or 1) then return { 'device_limit', tostring(count), tostring(rec.maxDevices or 1) } end
  table.insert(rec.devices, { deviceId = device, platform = platform, activatedAt = now, lastSeenAt = now })
end
rec.lastCheckedAt = now
redis.call('SET', KEYS[1], cjson.encode(rec))
return { 'ok', tostring(#(rec.devices or {})), tostring(rec.maxDevices or 1) }
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ active:false, error:'method_not_allowed' });
  const { key, deviceId, platform='unknown' } = req.body || {};
  const normalized = String(key || '').trim().toUpperCase();
  const device = String(deviceId || '').trim();
  if (!validKey(normalized)) return res.status(400).json({ active:false, error:'invalid_key' });
  if (!device || device.length > 200) return res.status(400).json({ active:false, error:'device_required' });
  const rl = `ratelimit:${normalized}`;
  const attempts = await redis.incr(rl);
  if (attempts === 1) await redis.expire(rl, 600);
  if (attempts > 30) return res.status(429).json({ active:false, reason:'too_many_attempts' });
  const result = await redis.eval(ACTIVATE_SCRIPT, [`license:${normalized}`], [device, String(platform).slice(0,40), String(Date.now())]);
  const status = result?.[0];
  if (status === 'ok') return res.status(200).json({ active:true, devices:Number(result[1]), maxDevices:Number(result[2]) });
  const map = { missing:[404,'invalid_key'], revoked:[403,'revoked'], expired:[403,'expired'], device_required:[400,'device_required'], device_limit:[403,'device_limit_reached'] };
  const [code, reason] = map[status] || [500,'activation_failed'];
  return res.status(code).json({ active:false, reason, devices: result?.[1] ? Number(result[1]) : undefined, maxDevices: result?.[2] ? Number(result[2]) : undefined });
}
