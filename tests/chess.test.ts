import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describePosition,playMove} from '../lib/chess';
test('reconstructs history and validates board and conversational moves',()=>{
 const first=playMove({moves:[],move:'e2e4'});
 const second=playMove({moves:first.moves,move:'e5'});
 assert.deepEqual(second.moves,['e4','e5']); assert.equal(second.turn,'White');
 assert.equal(second.fen,describePosition(['e4','e5']).fen);
});
test('rejects illegal moves and invalid history without changing the input',()=>{
 const input={moves:['e4'],move:'e5'};
 assert.throws(()=>playMove({moves:[],move:'e5'}));
 assert.throws(()=>playMove({moves:['e5'],move:'e4'}));
 playMove(input); assert.deepEqual(input,{moves:['e4'],move:'e5'});
});
test('recognizes checkmate and rejects further moves',()=>{
 const moves=['f3','e5','g4','Qh4#'];
 assert.equal(describePosition(moves).status,'checkmate');
 assert.throws(()=>playMove({moves,move:'a3'}));
});
test('replays castling and en passant correctly',()=>{
 const castled=playMove({moves:['e4','e5','Nf3','Nc6','Bc4','Nf6'],move:'O-O'});
 assert.equal(castled.board[7][6]?.type,'k'); assert.equal(castled.board[7][5]?.type,'r');
 const capture=playMove({moves:['e4','a6','e5','d5'],move:'exd6'});
 assert.equal(capture.board[2][3]?.type,'p');assert.equal(capture.board[3][3],null);
});
test('bounds untrusted history size and rejects malformed input',()=>{
 assert.throws(()=>playMove({moves:Array(401).fill('e4'),move:'e5'}));
 assert.throws(()=>playMove({moves:[],move:42}));
});

test('one board accepts exactly one opponent reply and rejects stale or late moves',async()=>{
 const {BoardSession}=await import('../lib/board-session');
 const session=new BoardSession();
 const validate=async(moves:string[],move:string)=>playMove({moves,move});
 await session.apply('e4',0,validate);
 session.awaitingReply=true;
 await assert.rejects(session.apply('e5',1,validate),/Wait for ChatGPT/);
 await session.apply('e5',1,validate,true);
 assert.deepEqual(session.position.moves,['e4','e5']);
 await assert.rejects(session.apply('e5',1,validate,true),/moved on/);
 await assert.rejects(session.apply('Nf3',2,validate,true),/not waiting/);
});
test('failed opponent validation preserves position and allows a legal retry',async()=>{
 const {BoardSession}=await import('../lib/board-session');
 const session=new BoardSession(['e4']);session.awaitingReply=true;
 const validate=async(moves:string[],move:string)=>playMove({moves,move});
 await assert.rejects(session.apply('e4',1,validate,true));
 assert.deepEqual(session.position.moves,['e4']);assert.equal(session.awaitingReply,true);
 await session.apply('e5',1,validate,true);assert.equal(session.position.revision,2);
});
