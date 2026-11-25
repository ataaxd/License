import redis from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 if(!requireAdmin(req,res)) return;
 const key=String(req.body?.key||'').trim().toUpperCase();
 const rec=await redis.get(`license:${key}`);
 if(!rec) return res.status(404).json({error:'not_found'});
 rec.status='revoked'; rec.revokedAt=Date.now(); await redis.set(`license:${key}`,rec);
 return res.status(200).json({ok:true});
}
