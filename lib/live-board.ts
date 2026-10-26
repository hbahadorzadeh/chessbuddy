import {randomBytes} from 'node:crypto';
import {describePosition, playMove, type Position} from './chess';

export type StoredBoard={moves:string[];revision:number};
export interface BoardStore {
  create(key:string,value:StoredBoard):Promise<void>;
  read(key:string):Promise<StoredBoard|null>;
  compareAndSwap(key:string,revision:number,value:StoredBoard):Promise<boolean>;
}
export function liveBoards(store:BoardStore) {
  function snapshot(boardKey:string,board:StoredBoard):Position{return {...describePosition(board.moves),boardKey};}
  return {
    async open(moves:string[]){const position=describePosition(moves);const key=randomBytes(32).toString('hex');const value={moves:position.moves,revision:position.revision};await store.create(key,value);return snapshot(key,value);},
    async read(key:string){const value=await store.read(key);if(!value)throw new Error('This live board expired or is unavailable. Open a new board.');return snapshot(key,value);},
    async play(key:string,expectedRevision:number,move:string){
      const current=await this.read(key);
      if(current.revision!==expectedRevision)throw new Error('REVISION_CONFLICT: read_practice_board before retrying.');
      const next=playMove({moves:current.moves,move});
      if(!await store.compareAndSwap(key,expectedRevision,{moves:next.moves,revision:next.revision}))throw new Error('REVISION_CONFLICT: read_practice_board before retrying.');
      return {...next,boardKey:key};
    },
  };
}
