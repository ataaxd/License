import crypto from 'crypto';
export const DAY_MS = 86400000;
export function makeKey(prefix='APP') {
  const p = String(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,10) || 'APP';
  return `${p}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
}
export function validKey(key) { return /^[A-Z0-9]{2,10}-[0-9A-F]{32}$/.test(key || ''); }
