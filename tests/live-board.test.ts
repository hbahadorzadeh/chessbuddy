import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveBoards,type BoardStore,type StoredBoard} from '../lib/live-board';
function memoryStore():BoardStore {
 const data=new Map<string,StoredBoard>();
 return {async create(k,v){data.set(k,v);},async read(k){return data.get(k)??null;},async compareAndSwap(k,r,v){if(data.get(k)?.revision!==r)return false;data.set(k,v);return true;}};
}
test('separate request handlers see human and opponent moves on the same board',async()=>{
 const store=memoryStore();const human=liveBoards(store);const opponent=liveBoards(store);
 const initial=await human.open([]);assert.match(initial.gameId!,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 await human.play(initial.gameId!,0,'e4');
 const read=await opponent.read(initial.gameId!);assert.deepEqual(read.moves,['e4']);
 await opponent.play(initial.gameId!,read.revision,'e5');
 assert.deepEqual((await human.read(initial.gameId!)).moves,['e4','e5']);
});
test('concurrent replies commit once; illegal moves preserve state; boards stay separate',async()=>{
 const boards=liveBoards(memoryStore());const a=await boards.open(['e4']);const b=await boards.open([]);
 await assert.rejects(boards.play(a.gameId!,1,'e4'));
 const results=await Promise.allSettled([boards.play(a.gameId!,1,'e5'),boards.play(a.gameId!,1,'c5')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await boards.read(a.gameId!)).revision,2);assert.equal((await boards.read(b.gameId!)).revision,0);
 await assert.rejects(boards.read('0'.repeat(64)),/GAME_UNAVAILABLE/);
});

test('UUID stays constant through both turns, reopening, and recovery',async()=>{
 const store=memoryStore();const games=liveBoards(store);const initial=await games.open([]);
 const white=await games.play(initial.gameId!,0,'e4');const black=await games.play(initial.gameId!,1,'c5');
 const reopened=await games.open([],initial.gameId);const recovered=await games.recover(initial.gameId!,['e4'],1);
 for(const state of [white,black,reopened,recovered])assert.equal(state.gameId,initial.gameId);
 assert.deepEqual(reopened.moves,['e4','c5']);assert.equal(recovered.revision,2);
 assert.notEqual((await games.open([])).gameId,initial.gameId);
 await assert.rejects(games.recover(initial.gameId!,['d4'],1),/HISTORY_CONFLICT/);
});
