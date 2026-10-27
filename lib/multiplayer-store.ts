/** Shared only inside ONE continuously running Node.js process. No disk/database persistence. */
export interface MultiplayerRecord {version:number;expiresAt:number}
export interface MultiplayerStore {
 create(id:string,record:MultiplayerRecord):Promise<boolean>;
 read(id:string):Promise<MultiplayerRecord|null>;
 compareAndSwap(id:string,version:number,record:MultiplayerRecord):Promise<boolean>;
}
export function createMemoryMultiplayerStore({now=Date.now,maxGames=1000}={}):MultiplayerStore&{prune():void}{
 const games=new Map<string,MultiplayerRecord>();
 const prune=()=>{for(const [id,g]of games)if(g.expiresAt<=now())games.delete(id);};
 const read=(id:string)=>{const g=games.get(id);if(g&&g.expiresAt<=now()){games.delete(id);return null;}return g??null;};
 return {
  prune,
  async create(id,g){prune();if(read(id))return false;if(g.expiresAt<=now())return false;if(games.size>=maxGames)throw new Error('CAPACITY_REACHED: no space for another game. Try again later.');games.set(id,structuredClone(g));return true;},
  async read(id){const g=read(id);return g?structuredClone(g):null;},
  async compareAndSwap(id,version,g){const current=read(id);if(!current||current.version!==version||g.expiresAt<=now())return false;
   // No await between comparison and write: atomic within this process only.
   games.set(id,structuredClone(g));return true;},
 };
}
// Next.js may bundle API and MCP routes separately. A process-global slot keeps them
// on the SAME map when running in the same Node process. It cannot join Vercel instances.
const key=Symbol.for('chessbuddy.multiplayer.memory.v1');
const globalStore=globalThis as typeof globalThis&{[key]?:ReturnType<typeof createMemoryMultiplayerStore>};
export function multiplayerStore():MultiplayerStore {
 if(!globalStore[key]){
  const store=createMemoryMultiplayerStore();globalStore[key]=store;
  const cleanup=setInterval(()=>store.prune(),60_000);cleanup.unref();
 }
 return globalStore[key]!;
}
