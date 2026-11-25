import redis from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';
import { makeKey, DAY_MS } from '../../../lib/license';
export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  if (!requireAdmin(req,res)) return;
  const { prefix='APP', count=1, days=30, maxDevices=1, note='' } = req.body || {};
  const n = Math.max(1, Math.min(50, Number(count)||1));
  const d = Math.max(0, Math.min(3650, Number(days)||0));
  const m = Math.max(1, Math.min(100, Number(maxDevices)||1));
  const created=[];
  for(let i=0;i<n;i++){
    const key=makeKey(prefix);
    const record={key,status:'active',createdAt:Date.now(),expiresAt:d?Date.now()+d*DAY_MS:null,maxDevices:m,devices:[],note:String(note).slice(0,300),lastCheckedAt:null};
    await redis.set(`license:${key}`,record); created.push(record);
  }
  return res.status(201).json({licenses:created});
}
