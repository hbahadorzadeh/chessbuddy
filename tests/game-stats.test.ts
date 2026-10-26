import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveBoards} from '../lib/live-board';
import {createMemoryBoardStore} from '../lib/memory-board-store';
import {GAME_RETENTION_MS,gameStats,restoreTiming} from '../lib/game-stats';
test('clocks alternate only after committed legal moves and each player has a move ledger',async()=>{
 let time=0;const now=()=>time;const games=liveBoards(createMemoryBoardStore({now}),now);
 const start=await games.open([]);time=5000;const white=await games.play(start.gameId!,0,'e4');
 assert.equal(white.stats.white.thinkingMs,5000);assert.equal(white.stats.black.thinkingMs,0);
 time=8000;await assert.rejects(games.play(start.gameId!,1,'e4'));
 assert.equal((await games.read(start.gameId!)).stats.black.thinkingMs,3000);
 const black=await games.play(start.gameId!,1,'c5');assert.equal(black.stats.white.moves,1);assert.equal(black.stats.black.moves,1);
 assert.deepEqual(black.stats.moveLog.map(m=>m.thinkingMs),[5000,3000]);
 time=10000;assert.equal((await games.read(start.gameId!)).stats.white.thinkingMs,7000);
 assert.equal((await games.read(start.gameId!)).stats.elapsedMs,10000);
});
test('timer freezes after checkmate and survives same-UUID recovery',async()=>{
 let time=0;const now=()=>time;const games=liveBoards(createMemoryBoardStore({now}),now);const start=await games.open([]);
 for(const [i,move] of ['f3','e5','g4','Qh4#'].entries()){time+=1000;await games.play(start.gameId!,i,move);}
 time=9999;const finished=await games.read(start.gameId!);assert.equal(finished.stats.elapsedMs,4000);assert.equal(finished.stats.white.thinkingMs,2000);assert.equal(finished.stats.black.thinkingMs,2000);
 const cold=liveBoards(createMemoryBoardStore({now}),now);const restored=await cold.recover(start.gameId!,finished.moves,4,finished.timing);
 assert.equal(restored.gameId,start.gameId);assert.deepEqual(restored.stats.moveLog,finished.stats.moveLog);assert.equal(restored.stats.elapsedMs,4000);
 assert.ok(restoreTiming(finished.timing,4));
});
test('default retention is seven days after the last committed move; reads do not extend it',async()=>{
 let time=0;const now=()=>time;const games=liveBoards(createMemoryBoardStore({now}),now);const start=await games.open([]);
 time=1000;const moved=await games.play(start.gameId!,0,'e4');assert.equal(moved.stats.expiresAt,GAME_RETENTION_MS+1000);
 time=GAME_RETENTION_MS+999;assert.ok(await games.read(start.gameId!));
 time++;await assert.rejects(games.read(start.gameId!),/GAME_UNAVAILABLE/);
 await assert.rejects(games.recover(start.gameId!,moved.moves,1,moved.timing),/GAME_EXPIRED/);
});
test('history-only recovery reports unknown historical move times',async()=>{
 const now=()=>100;const games=liveBoards(createMemoryBoardStore({now}),now);const game=await games.open(['e4','e5']);
 assert.equal(game.stats.approximate,true);assert.deepEqual(game.stats.moveLog.map(m=>m.thinkingMs),[null,null]);
 assert.equal(gameStats(['e4'],undefined,false).white.thinkingMs,null);
});
