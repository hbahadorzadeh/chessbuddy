import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryBoardStore} from '../lib/memory-board-store';
import {liveBoards} from '../lib/live-board';
test('memory cache expires and evicts positions with bounded capacity',async()=>{
 let time=0;const cache=createMemoryBoardStore({maxBoards:2,ttlMs:100,now:()=>time});
 await cache.create('a',{moves:[],revision:0});await cache.create('b',{moves:[],revision:0});
 await cache.create('c',{moves:[],revision:0});assert.equal(await cache.read('a'),null);
 time=100;assert.equal(await cache.read('c'),null);
 assert.equal(await cache.compareAndSwap('b',0,{moves:['e4'],revision:1}),false);
});
test('cache isolates returned histories and only advances the expected revision',async()=>{
 const cache=createMemoryBoardStore();await cache.create('a',{moves:[],revision:0});
 const value=await cache.read('a');value!.moves.push('e4');assert.deepEqual((await cache.read('a'))!.moves,[]);
 const attempts=await Promise.all([cache.compareAndSwap('a',0,{moves:['e4'],revision:1}),cache.compareAndSwap('a',0,{moves:['d4'],revision:1})]);
 assert.equal(attempts.filter(Boolean).length,1);
});
test('a cold instance rejects missing boards and can recover history under a new key',async()=>{
 const original=liveBoards(createMemoryBoardStore());const cold=liveBoards(createMemoryBoardStore());
 const board=await original.open(['e4','e5']);
 await assert.rejects(cold.read(board.boardKey!),/unavailable/);
 const recovered=await cold.open(board.moves);assert.notEqual(recovered.boardKey,board.boardKey);assert.equal(recovered.fen,board.fen);
});
