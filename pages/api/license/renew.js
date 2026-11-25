import redis from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';
const DAY=86400000;
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 if(!requireAdmin(req,res)) return;
 const key=String(req.body?.key||'').trim().toUpperCase();
 const days=Math.max(1,Math.min(3650,Number(req.body?.days)||30));
 const rec=await redis.get(`license:${key}`);
 if(!rec) return res.status(404).json({error:'not_found'});
 const base=rec.expiresAt && rec.expiresAt>Date.now()?rec.expiresAt:Date.now();
 rec.expiresAt=base+days*DAY; rec.status='active'; await redis.set(`license:${key}`,rec);
 return res.status(200).json({ok:true,license:rec});
}
