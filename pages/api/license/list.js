import redis from '../../../lib/kv';
import { requireAdmin } from '../../../lib/auth';
export default async function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 if(!requireAdmin(req,res)) return;
 const keys=await redis.keys('license:*');
 const values=keys.length?await redis.mget(...keys):[];
 const licenses=values.filter(Boolean).sort((a,b)=>b.createdAt-a.createdAt);
 return res.status(200).json({licenses,serverTime:Date.now()});
}
