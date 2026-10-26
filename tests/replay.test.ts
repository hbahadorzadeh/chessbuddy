import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {buildReplay,createReplayStore} from '../lib/replay';
import {replayDelay} from '../lib/replay-playback';
import {chessGuidance} from '../lib/chess-guidance';
import {GAME_RETENTION_MS} from '../lib/game-stats';
test('a continuation can start from Black to move at a later move number',()=>{
 const chess=new Chess();chess.move('e4');const fen=chess.fen().split(' ');fen[5]='42';
 const replay=buildReplay({initialFen:fen.join(' '),moves:['c5','Nf3','Nc6'],startPly:2});
 assert.equal(replay.cursor,2);assert.equal(replay.frames[1].player,'Black');assert.equal(replay.frames[1].moveNumber,42);assert.equal(replay.frames[2].moveNumber,43);
 assert.equal(replay.frames[0].fen,fen.join(' '));
 const guidance=chessGuidance(replay.moves.slice(0,2),{initialFen:replay.initialFen,mode:'teach'});assert.equal(guidance.fen,replay.frames[2].fen);
});
test('PGN main line, setup FEN, elapsed comments and supplied timing are supported',()=>{
 const replay=buildReplay({pgn:'[White "Example"]\n[Black "Training"]\n\n1. e4 {[%emt 0:00:02]} e5 {[%clk 0:04:58]} 2. Nf3',startPly:1});
 assert.deepEqual(replay.moves,['e4','e5','Nf3']);assert.equal(replay.frames[1].durationMs,2000);assert.equal(replay.frames[2].durationMs,null);
 const supplied=buildReplay({moves:['e4','e5'],durationsMs:[0,3500]});assert.equal(supplied.frames[1].durationMs,0);assert.equal(supplied.frames[2].durationMs,3500);
 const fen='6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 19';
 const setup=buildReplay({pgn:`[SetUp "1"]\n[FEN "${fen}"]\n\n19. Re8#`});assert.equal(setup.initialFen,fen);assert.equal(setup.frames[1].san,'Re8#');
 const injected=buildReplay({initialFen:fen,pgn:'19. Re8#'});assert.equal(injected.initialFen,fen);
});
test('special moves replay legally from their supplied initial position',()=>{
 const castle=buildReplay({initialFen:'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',moves:['O-O','O-O-O']});assert.equal(new Chess(castle.frames[2].fen).get('c8')?.type,'k');
 const promotion=buildReplay({initialFen:'8/4P1k1/8/8/8/8/8/4K3 w - - 0 1',moves:['e8=N']});assert.equal(new Chess(promotion.frames[1].fen).get('e8')?.type,'n');
 const chess=new Chess();for(const move of ['e4','a6','e5','d5'])chess.move(move);
 const ep=buildReplay({initialFen:chess.fen(),moves:['exd6']});assert.equal(new Chess(ep.frames[1].fen).get('d5'),undefined);
});
test('invalid histories, initial positions, timing alignment and start indices fail clearly',()=>{
 assert.throws(()=>buildReplay({moves:['e5']}),/Illegal replay move/);
 assert.throws(()=>buildReplay({moves:['e4'],startPly:2}),/Starting ply/);
 assert.throws(()=>buildReplay({moves:['e4'],durationsMs:[]}),/one duration/);
 assert.throws(()=>buildReplay({moves:[],initialFen:'invalid'}));
 assert.throws(()=>buildReplay({moves:[],pgn:'1. e4'}),/exactly one/);
 const fen='6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 19';
 assert.throws(()=>buildReplay({initialFen:new Chess().fen(),pgn:`[SetUp "1"]\n[FEN "${fen}"]\n\n19. Re8#`}),/conflicts/);
 assert.throws(()=>buildReplay({moves:['f3','e5','g4','Qh4#','a3']}),/finished position/);
});
test('replay cursor is separate, seekable and revision-protected; store expires after one week',()=>{
 let time=100;const store=createReplayStore({now:()=>time});const replay=store.create({moves:['e4','e5','Nf3'],startPly:1});
 assert.equal(store.seek(replay.replayId,3,0).cursor,3);assert.throws(()=>store.seek(replay.replayId,0,0),/REVISION_CONFLICT/);
 assert.equal(store.seek(replay.replayId,0,1).frames[0].ply,0);assert.equal(store.read(replay.replayId).moves.length,3);
 time+=GAME_RETENTION_MS;assert.throws(()=>store.read(replay.replayId),/REPLAY_UNAVAILABLE/);
});
test('playback uses elapsed times when available and a speed-scaled default when unknown',()=>{
 assert.equal(replayDelay(8000,true,4),2000);assert.equal(replayDelay(null,true,2),750);assert.equal(replayDelay(8000,false,1),1500);assert.equal(replayDelay(0,true,1),50);
 const still=buildReplay({moves:[],initialFen:'8/4P1k1/8/8/8/8/8/4K3 w - - 0 1'});assert.equal(still.frames.length,1);
});
