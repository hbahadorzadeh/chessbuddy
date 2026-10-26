import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveBoards} from '../lib/live-board';
import {createMemoryBoardStore} from '../lib/memory-board-store';
import {gameSnapshot} from '../lib/game-snapshot';
import {GAME_RETENTION_MS} from '../lib/game-stats';
test('every request may use a different instance while carrying its last accepted snapshot',async()=>{
 const fresh=()=>liveBoards(createMemoryBoardStore());
 const start=await fresh().open([]);
 const white=await fresh().play(start.gameId!,0,'e4',gameSnapshot(start));
 const read=await fresh().read(start.gameId!,gameSnapshot(white));assert.deepEqual(read.moves,['e4']);
 const black=await fresh().play(start.gameId!,1,'c5',gameSnapshot(read));
 assert.equal(black.gameId,start.gameId);assert.deepEqual(black.moves,['e4','c5']);
 assert.equal(black.timing!.moveTimesMs.length,2);
});
test('snapshot cannot cross UUIDs, rewind newer state, or overwrite another branch',async()=>{
 const games=liveBoards(createMemoryBoardStore());const start=await games.open([]);const other=await games.open([]);
 await assert.rejects(games.read(other.gameId!,gameSnapshot(start)),/SNAPSHOT_MISMATCH/);
 const white=await games.play(start.gameId!,0,'e4');const black=await games.play(start.gameId!,1,'c5');
 assert.equal((await games.read(start.gameId!,gameSnapshot(start))).revision,2);
 const branch=await liveBoards(createMemoryBoardStore()).recover(start.gameId!,['d4'],1);
 await assert.rejects(games.read(start.gameId!,gameSnapshot(branch)),/HISTORY_CONFLICT/);
 assert.deepEqual((await games.read(start.gameId!)).moves,black.moves);
 await assert.rejects(games.play(start.gameId!,0,'e4',gameSnapshot(white)),/SNAPSHOT_MISMATCH/);
});
test('a repeated move returns its committed result without double-counting moves or clocks',async()=>{
 const games=liveBoards(createMemoryBoardStore());const start=await games.open([]);
 const [a,b]=await Promise.all([games.play(start.gameId!,0,'e4',gameSnapshot(start)),games.play(start.gameId!,0,'e4',gameSnapshot(start))]);
 assert.deepEqual(a.moves,['e4']);assert.deepEqual(b.moves,['e4']);assert.deepEqual(a.timing,b.timing);
 const repeated=await games.play(start.gameId!,0,'e4',gameSnapshot(start));assert.equal(repeated.revision,1);assert.deepEqual(repeated.timing,a.timing);
 await assert.rejects(games.play(start.gameId!,0,'d4',gameSnapshot(start)),/REVISION_CONFLICT/);
});
test('expired snapshots do not revive a missing game',async()=>{
 let time=100;const now=()=>time;const games=liveBoards(createMemoryBoardStore({now}),now);const start=await games.open([]);
 time+=GAME_RETENTION_MS;
 const cold=liveBoards(createMemoryBoardStore({now}),now);await assert.rejects(cold.read(start.gameId!,gameSnapshot(start)),/GAME_EXPIRED/);
});
