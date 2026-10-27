import {multiplayerCommandResult,multiplayerLinks} from '@/lib/multiplayer-commands';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 const origin=request.headers.get('origin');
 if(origin){
  let allowed=false;
  try{const parsed=new URL(origin);const target=new URL(request.url);allowed=parsed.origin===target.origin||(parsed.host===request.headers.get('host')&&parsed.protocol===target.protocol); }catch{/* Reject invalid origins. */}
  if(!allowed)return Response.json({error:'Origin not allowed'},{status:403,headers});
 }
 if(Number(request.headers.get('content-length')??0)>8192)return Response.json({error:'Request too large'},{status:413,headers});
 try{
  const text=await request.text();if(text.length>8192)return Response.json({error:'Request too large'},{status:413,headers});
  const state=await multiplayerCommandResult(JSON.parse(text));
  return Response.json('isOwner'in state?multiplayerLinks(state,new URL(request.url).origin):state,{headers});
 }catch(e){const error=e instanceof Error?e.message:'Multiplayer request failed.';return Response.json({error},{status:/CAPACITY_REACHED/.test(error)?503:400,headers});}
}
