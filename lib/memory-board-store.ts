import {GAME_RETENTION_MS} from './game-stats';
import type {BoardStore,StoredBoard} from './live-board';

/** Best-effort instance-local cache. Vercel instances never share this map. */
export function createMemoryBoardStore({maxBoards=1000,ttlMs=GAME_RETENTION_MS,now=Date.now}={}) : BoardStore {
  const entries=new Map<string,{value:StoredBoard;expires:number}>();
  const copy=(value:StoredBoard):StoredBoard=>structuredClone(value);
  function find(key:string){
    const entry=entries.get(key);
    if(entry && entry.expires<=now()){entries.delete(key);return;}
    return entry;
  }
  function write(key:string,value:StoredBoard){
    entries.delete(key);
    entries.set(key,{value:copy(value),expires:Math.min(now()+ttlMs,value.timing?value.timing.updatedAt+GAME_RETENTION_MS:Infinity)});
  }
  return {
    async create(key,value){
      for(const k of entries.keys())find(k);
      if(entries.has(key))throw new Error('Board key already exists.');
      while(entries.size>=maxBoards)entries.delete(entries.keys().next().value!);
      write(key,value);
    },
    async read(key){const entry=find(key);return entry?copy(entry.value):null;},
    async compareAndSwap(key,revision,value){
      const entry=find(key);
      if(!entry || entry.value.revision!==revision)return false;
      // No await between the check and write: atomic within one JS process.
      write(key,value);return true;
    },
  };
}
export const memoryBoardStore=createMemoryBoardStore();
