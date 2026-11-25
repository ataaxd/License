import { Redis } from '@upstash/redis';

// Redis.fromEnv() otomatis baca KV_REST_API_URL / KV_REST_API_TOKEN
// (nama env var yang diisi Vercel saat kamu connect integrasi Upstash lewat Marketplace).
const kv = Redis.fromEnv();

export default kv;
