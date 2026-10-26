import {randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';
import {z} from 'zod';
import {GAME_RETENTION_MS} from './game-stats';

export const replayInput=z.object({
 title:z.string().max(100).optional(),initialFen:z.string().max(160).optional(),
 moves:z.array(z.string().min(2).max(12)).max(1000).optional(),pgn:z.string().max(50000).optional(),
 durationsMs:z.array(z.number().int().min(0).max(GAME_RETENTION_MS).nullable()).max(1000).optional(),startPly:z.number().int().min(0).default(0),
});
export type ReplayFrame={ply:number;fen:string;san:string|null;player:'White'|'Black'|null;moveNumber:number;durationMs:number|null};
export type Replay={kind:'replay';replayId:string;title:string;initialFen:string;moves:string[];frames:ReplayFrame[];cursor:number;revision:number;createdAt:number;expiresAt:number;headers:Record<string,string>;source:string;originGameId?:string};
function elapsedComment(comment:string|undefined):number|null {
 const match=comment?.match(/\[%emt\s+(\d+):(\d{2}):(\d{2}(?:\.\d+)?)\]/);
 if(!match || Number(match[2])>=60 || Number(match[3])>=60)return null;
 const ms=Math.round((Number(match[1])*3600+Number(match[2])*60+Number(match[3]))*1000);
 return ms<=GAME_RETENTION_MS?ms:null;
}
export function buildReplay(raw:unknown,now=Date.now()):Replay {
 const input=replayInput.parse(raw);
 if((input.moves!==undefined?1:0)+(input.pgn!==undefined?1:0)!==1)throw new Error('Supply exactly one move list or PGN. Use moves: [] for a position-only replay.');
 let initialFen=new Chess(input.initialFen).fen();let moves:string[];let headers:Record<string,string>={};let comments=new Map<string,string>();
 if(input.pgn!==undefined){
  const imported=new Chess();let pgn=input.pgn;
  const hasFen=/^\s*\[FEN\s+"/m.test(pgn);
  if(input.initialFen && !hasFen)pgn=`[SetUp "1"]\n[FEN "${initialFen}"]\n${pgn}`;
  imported.loadPgn(pgn,{strict:true});
  const history=imported.history({verbose:true});if(history.length>1000)throw new Error('Replay limit is 1,000 half-moves.');
  headers=imported.getHeaders();initialFen=history[0]?.before??headers.FEN??new Chess().fen();
  if(input.initialFen && new Chess(initialFen).fen()!==new Chess(input.initialFen).fen())throw new Error('The supplied initial FEN conflicts with the PGN starting position.');
  moves=imported.history();comments=new Map(imported.getComments().map(c=>[c.fen,c.comment]));
 }else moves=input.moves!;
 if(input.startPly>moves.length)throw new Error('Starting ply is outside this replay. Ply zero is the supplied initial position.');
 if(input.durationsMs && input.durationsMs.length!==moves.length)throw new Error('Provide exactly one duration (or null) per half-move.');
 const chess=new Chess(initialFen);
 const frames:ReplayFrame[]=[{ply:0,fen:chess.fen(),san:null,player:null,moveNumber:Number(chess.fen().split(' ')[5]),durationMs:null}];
 const canonical:string[]=[];
 for(const [i,move] of moves.entries()){
  if(chess.isCheckmate()||chess.isStalemate())throw new Error(`Move ${i+1} follows a finished position.`);
  const moveNumber=Number(chess.fen().split(' ')[5]);
  const uci=/^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(move);
  let applied;try{applied=chess.move(uci?{from:uci[1],to:uci[2],promotion:uci[3]}:move,{strict:true});}catch{throw new Error(`Illegal replay move ${i+1}: ${move}. Check the supplied initial FEN and move sequence.`);}
  canonical.push(applied.san);
  frames.push({ply:i+1,fen:chess.fen(),san:applied.san,player:applied.color==='w'?'White':'Black',moveNumber,durationMs:input.durationsMs?input.durationsMs[i]:elapsedComment(comments.get(chess.fen()))});
 }
 return {kind:'replay',replayId:randomUUID(),title:(input.title??(headers.White && headers.Black?`${headers.White} – ${headers.Black}`:'Chess replay')).slice(0,100),initialFen:new Chess(initialFen).fen(),moves:canonical,frames,cursor:input.startPly,revision:0,createdAt:now,expiresAt:now+GAME_RETENTION_MS,headers,source:input.pgn!==undefined?'Supplied PGN; player/event metadata has not been independently verified.':'Supplied move sequence; no historical-game provenance is claimed.'};
}
export function createReplayStore({now=Date.now,maxReplays=100}={}){
 const records=new Map<string,Replay>();
 const copy=(replay:Replay)=>structuredClone(replay);
 function read(id:string){const record=records.get(id);if(!record || record.expiresAt<=now()){records.delete(id);throw new Error('REPLAY_UNAVAILABLE: this instance has no replay. Re-import the original PGN or move sequence.');}return copy(record);}
 return {
  create(input:unknown,originGameId?:string){const record=buildReplay(input,now());if(originGameId)record.originGameId=originGameId;for(const [key,r] of records)if(r.expiresAt<=now())records.delete(key);while(records.size>=maxReplays)records.delete(records.keys().next().value!);records.set(record.replayId,record);return copy(record);},
  read,
  seek(id:string,ply:number,expectedRevision:number){const record=read(id);if(record.revision!==expectedRevision)throw new Error('REVISION_CONFLICT: refresh this replay before seeking.');if(!Number.isInteger(ply)||ply<0||ply>=record.frames.length)throw new Error('Replay ply outside range.');record.cursor=ply;record.revision++;records.set(id,record);return copy(record);},
 };
}
export const replayStore=createReplayStore();
