import {z} from 'zod';
export const GAME_RETENTION_MS=7*24*60*60*1000;
export const timingSchema=z.object({
 createdAt:z.number().int().nonnegative(),updatedAt:z.number().int().nonnegative(),turnStartedAt:z.number().int().nonnegative(),
 finishedAt:z.number().int().nonnegative().optional(),whiteMs:z.number().int().nonnegative(),blackMs:z.number().int().nonnegative(),
 moveTimesMs:z.array(z.number().int().nonnegative().nullable()).max(401),approximate:z.boolean(),
});
export type GameTiming=z.infer<typeof timingSchema>;
export function initialTiming(moveCount:number,now:number):GameTiming {
 return {createdAt:now,updatedAt:now,turnStartedAt:now,whiteMs:0,blackMs:0,moveTimesMs:Array(moveCount).fill(null),approximate:moveCount>0};
}
export function restoreTiming(raw:unknown,moveCount:number):GameTiming|undefined {
 const parsed=timingSchema.safeParse(raw);if(!parsed.success)return;
 const t=parsed.data;
 if(t.moveTimesMs.length!==moveCount || t.createdAt>t.updatedAt || t.turnStartedAt!==t.updatedAt || (t.finishedAt!==undefined && t.finishedAt!==t.updatedAt))return;
 const total=(parity:number)=>t.moveTimesMs.reduce<number>((sum,n,i)=>sum+(i%2===parity?(n??0):0),0);
 if(total(0)!==t.whiteMs || total(1)!==t.blackMs)return;
 return t;
}
export function commitTiming(timing:GameTiming|undefined,previousMoveCount:number,gameOver:boolean,now:number):GameTiming {
 const current=timing??initialTiming(previousMoveCount,now);
 const timestamp=Math.max(now,current.updatedAt);
 const duration=Math.max(0,timestamp-current.turnStartedAt);
 return {...current,updatedAt:timestamp,turnStartedAt:timestamp,finishedAt:gameOver?timestamp:undefined,
  whiteMs:current.whiteMs+(previousMoveCount%2===0?duration:0),blackMs:current.blackMs+(previousMoveCount%2===1?duration:0),moveTimesMs:[...current.moveTimesMs,duration]};
}
export function gameStats(moves:string[],timing:GameTiming|undefined,gameOver:boolean,now=Date.now()) {
 const running=timing && !gameOver?Math.max(0,now-timing.turnStartedAt):0;
 return {
  elapsedMs:timing?Math.max(0,(timing.finishedAt??now)-timing.createdAt):null,
  white:{moves:Math.ceil(moves.length/2),thinkingMs:timing?timing.whiteMs+(moves.length%2===0?running:0):null},
  black:{moves:Math.floor(moves.length/2),thinkingMs:timing?timing.blackMs+(moves.length%2===1?running:0):null},
  moveLog:moves.map((san,i)=>({ply:i+1,moveNumber:Math.floor(i/2)+1,player:i%2===0?'White':'Black',san,thinkingMs:timing?.moveTimesMs[i]??null})),
  expiresAt:timing?timing.updatedAt+GAME_RETENTION_MS:null,approximate:timing?.approximate??true,
 };
}
export function formatDuration(milliseconds:number|null){
 if(milliseconds===null)return '—';
 const seconds=Math.floor(Math.max(0,milliseconds)/1000);
 const hours=Math.floor(seconds/3600);const minutes=Math.floor(seconds/60)%60;
 return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
