import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveBoards,type BoardStore,type StoredBoard} from '../lib/live-board';
function memoryStore():BoardStore {
 const data=new Map<string,StoredBoard>();
 return {async create(k,v){data.set(k,v);},async read(k){return data.get(k)??null;},async compareAndSwap(k,r,v){if(data.get(k)?.revision!==r)return false;data.set(k,v);return true;}};
}
test('separate request handlers see human and opponent moves on the same board',async()=>{
 const store=memoryStore();const human=liveBoards(store);const opponent=liveBoards(store);
 const initial=await human.open([]);assert.match(initial.boardKey!,/^[a-f0-9]{64}$/);
 await human.play(initial.boardKey!,0,'e4');
 const read=await opponent.read(initial.boardKey!);assert.deepEqual(read.moves,['e4']);
 await opponent.play(initial.boardKey!,read.revision,'e5');
 assert.deepEqual((await human.read(initial.boardKey!)).moves,['e4','e5']);
});
test('concurrent replies commit once; illegal moves preserve state; boards stay separate',async()=>{
 const boards=liveBoards(memoryStore());const a=await boards.open(['e4']);const b=await boards.open([]);
 await assert.rejects(boards.play(a.boardKey!,1,'e4'));
 const results=await Promise.allSettled([boards.play(a.boardKey!,1,'e5'),boards.play(a.boardKey!,1,'c5')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await boards.read(a.boardKey!)).revision,2);assert.equal((await boards.read(b.boardKey!)).revision,0);
 await assert.rejects(boards.read('0'.repeat(64)),/expired/);
});
