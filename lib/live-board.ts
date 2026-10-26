import {gameSnapshotSchema,type GameSnapshot} from './game-snapshot';
import {initialTiming,commitTiming,restoreTiming,gameStats,GAME_RETENTION_MS,type GameTiming} from './game-stats';
import {randomUUID} from 'node:crypto';
import {describePosition, playMove, type Position} from './chess';

export type StoredBoard={moves:string[];revision:number;timing?:GameTiming};
export interface BoardStore {
  create(key:string,value:StoredBoard):Promise<void>;
  read(key:string):Promise<StoredBoard|null>;
  compareAndSwap(key:string,revision:number,value:StoredBoard):Promise<boolean>;
}
export function liveBoards(store:BoardStore,now=Date.now) {
  function snapshot(gameId:string,board:StoredBoard):Position{const position=describePosition(board.moves);return {...position,gameId,timing:board.timing,stats:gameStats(position.moves,board.timing,position.gameOver,now())};}
  const prefix=(a:string[],b:string[])=>a.every((m,i)=>b[i]===m);
  return {
    async open(moves:string[]=[],gameId?:string){
      if(gameId)return this.read(gameId);
      const position=describePosition(moves);const id=randomUUID();
      const timing=initialTiming(position.moves.length,now());if(position.gameOver)timing.finishedAt=timing.updatedAt;
      const record={moves:position.moves,revision:position.revision,timing};
      await store.create(id,record);return snapshot(id,record);
    },
    async read(gameId:string,saved?:GameSnapshot):Promise<Position>{
      if(saved){
        const parsed=gameSnapshotSchema.parse(saved);
        if(parsed.gameId!==gameId)throw new Error('SNAPSHOT_MISMATCH: this history belongs to another game.');
        return this.recover(gameId,parsed.moves,parsed.moves.length,parsed.timing,parsed.expiresAt??undefined);
      }
      const value=await store.read(gameId);
      if(!value)throw new Error('GAME_UNAVAILABLE: provide the latest snapshot (same gameId, complete moves and timing) or recover known history. Do not create a replacement game.');
      return snapshot(gameId,value);
    },
    async recover(gameId:string,moves:string[],expectedRevision:number,recoveredTiming?:GameTiming,expiresAt?:number):Promise<Position>{
      const restored=describePosition(moves);
      if(restored.revision!==expectedRevision)throw new Error('INVALID_HISTORY: revision must match the complete history.');
      const knownTiming=restoreTiming(recoveredTiming,moves.length);
      if(recoveredTiming && !knownTiming)throw new Error('INVALID_TIMING: move durations must match the history.');
      const timing=knownTiming??initialTiming(moves.length,now());
      if(restored.gameOver && timing.finishedAt===undefined)timing.finishedAt=timing.updatedAt;
      const record={moves:restored.moves,revision:expectedRevision,timing};
      const existing=await store.read(gameId);
      if(existing){
        if(existing.revision>=expectedRevision){
          if(!prefix(restored.moves,existing.moves))throw new Error('HISTORY_CONFLICT: recovery cannot replace a different history.');
          return snapshot(gameId,existing);
        }
        if(!prefix(existing.moves,restored.moves))throw new Error('HISTORY_CONFLICT: recovery cannot replace a different history.');
        if((expiresAt!==undefined && expiresAt<=now()) || timing.updatedAt+GAME_RETENTION_MS<=now())throw new Error('GAME_EXPIRED: the seven-day retention period has ended.');
        if(!await store.compareAndSwap(gameId,existing.revision,record))throw new Error('REVISION_CONFLICT: refresh before retrying recovery.');
      }else{
        if((expiresAt!==undefined && expiresAt<=now()) || timing.updatedAt+GAME_RETENTION_MS<=now())throw new Error('GAME_EXPIRED: the seven-day retention period has ended.');
        try{await store.create(gameId,record);}
        catch(error){if(!await store.read(gameId))throw error;return this.recover(gameId,moves,expectedRevision,recoveredTiming,expiresAt);}
      }
      return snapshot(gameId,record);
    },
    async play(gameId:string,expectedRevision:number,move:string,saved?:GameSnapshot){
      if(saved && saved.moves.length!==expectedRevision)throw new Error('SNAPSHOT_MISMATCH: snapshot history must match expectedRevision.');
      const current=await this.read(gameId,saved);
      const repeated=(position:Position)=>{
        if(position.revision!==expectedRevision+1)return false;
        try{return JSON.stringify(playMove({moves:position.moves.slice(0,expectedRevision),move}).moves)===JSON.stringify(position.moves);}
        catch{return false;}
      };
      if(repeated(current))return current;
      if(current.revision!==expectedRevision)throw new Error('REVISION_CONFLICT: read_practice_board before retrying.');
      const next=playMove({moves:current.moves,move});
      const record={moves:next.moves,revision:next.revision,timing:commitTiming(current.timing,current.revision,next.gameOver,now())};
      if(!await store.compareAndSwap(gameId,expectedRevision,record)){
        const latest=await this.read(gameId);
        if(repeated(latest))return latest;
        throw new Error('REVISION_CONFLICT: read_practice_board before retrying.');
      }
      return snapshot(gameId,record);
    },
  };
}
