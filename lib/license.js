import crypto from 'crypto';

export const DEFAULT_PREFIX = 'PBH';
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

// Berapa lama (menit) sebuah perangkat dianggap "masih aktif" sejak heartbeat
// terakhirnya. Kalau lewat dari ini tanpa ada panggilan activate() baru dari
// deviceId tsb, slotnya otomatis lepas dan bisa dipakai perangkat lain.
// Bisa di-override per kode lewat field `sessionTtlMinutes` saat generate/renew.
export const DEFAULT_SESSION_TTL_MINUTES = 5;

export function generateLicenseKey(prefix) {
  const cleanPrefix = (prefix || DEFAULT_PREFIX)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || DEFAULT_PREFIX;
  const hex = crypto.randomBytes(16).toString('hex').toUpperCase();
  return `${cleanPrefix}-${hex}`;
}

// Format umum PREFIX-32HEX, cocok dengan regex /^PBH-[0-9A-F]{32}$/
// yang sudah dipakai di lobby-license.js kalau prefix-nya dibiarkan PBH.
export function isValidFormat(key) {
  return /^[A-Z0-9]{2,10}-[0-9A-F]{32}$/.test(key || '');
}
