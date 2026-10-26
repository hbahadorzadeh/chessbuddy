import {randomUUID} from 'node:crypto';
import {describePosition, playMove, type Position} from './chess';

export type StoredBoard={moves:string[];revision:number};
export interface BoardStore {
  create(key:string,value:StoredBoard):Promise<void>;
  read(key:string):Promise<StoredBoard|null>;
  compareAndSwap(key:string,revision:number,value:StoredBoard):Promise<boolean>;
}
export function liveBoards(store:BoardStore) {
  function snapshot(gameId:string,board:StoredBoard):Position{return {...describePosition(board.moves),gameId};}
  const prefix=(a:string[],b:string[])=>a.every((m,i)=>b[i]===m);
  return {
    async open(moves:string[]=[],gameId?:string){
      if(gameId)return this.read(gameId);
      const position=describePosition(moves);const id=randomUUID();
      await store.create(id,{moves:position.moves,revision:position.revision});
      return {...position,gameId:id};
    },
    async read(gameId:string){const value=await store.read(gameId);if(!value)throw new Error('GAME_UNAVAILABLE: this game is not in this instance’s memory. Recover its history using the same gameId.');return snapshot(gameId,value);},
    async recover(gameId:string,moves:string[],expectedRevision:number):Promise<Position>{
      const restored=describePosition(moves);
      if(restored.revision!==expectedRevision)throw new Error('INVALID_HISTORY: revision must match the complete history.');
      const existing=await store.read(gameId);
      if(existing){
        if(existing.revision>=expectedRevision){
          if(!prefix(restored.moves,existing.moves))throw new Error('HISTORY_CONFLICT: recovery cannot replace a different history.');
          return snapshot(gameId,existing);
        }
        if(!prefix(existing.moves,restored.moves))throw new Error('HISTORY_CONFLICT: recovery cannot replace a different history.');
        if(!await store.compareAndSwap(gameId,existing.revision,{moves:restored.moves,revision:expectedRevision}))throw new Error('REVISION_CONFLICT: refresh before retrying recovery.');
      }else{
        try{await store.create(gameId,{moves:restored.moves,revision:expectedRevision});}
        catch(error){if(!await store.read(gameId))throw error;return this.recover(gameId,moves,expectedRevision);}
      }
      return {...restored,gameId};
    },
    async play(gameId:string,expectedRevision:number,move:string){
      const current=await this.read(gameId);
      if(current.revision!==expectedRevision)throw new Error('REVISION_CONFLICT: read_practice_board before retrying.');
      const next=playMove({moves:current.moves,move});
      if(!await store.compareAndSwap(gameId,expectedRevision,{moves:next.moves,revision:next.revision}))throw new Error('REVISION_CONFLICT: read_practice_board before retrying.');
      return {...next,gameId};
    },
  };
}
