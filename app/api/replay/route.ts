import {replayStore} from '@/lib/replay';
import {z} from 'zod';
export async function POST(request:Request){
 if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403});
 try{
  const raw=await request.text();if(raw.length>131072)return Response.json({error:'Request too large'},{status:413});
  const {name,args}=JSON.parse(raw);
  if(name==='create_replay')return Response.json(replayStore.create(args));
  const {replayId}=z.object({replayId:z.string().uuid()}).parse(args);
  if(name==='read_replay')return Response.json(replayStore.read(replayId));
  if(name==='seek_replay'){const {ply,expectedRevision}=z.object({ply:z.number().int().min(0).max(1000),expectedRevision:z.number().int().min(0)}).parse(args);return Response.json(replayStore.seek(replayId,ply,expectedRevision));}
  throw new Error('Unknown replay action');
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Replay request failed'},{status:400});}
}
