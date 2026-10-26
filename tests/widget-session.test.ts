import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreSession} from '../lib/widget-session';
import {describePosition} from '../lib/chess';
import {BoardSession} from '../lib/board-session';
const id='5f764aae-c173-442e-84c0-487ca5ec19ad';
test('remount restores newer browser history only for the same UUID',()=>{
 const incoming={...describePosition([]),gameId:id};
 const restored=restoreSession(incoming,{gameId:id,moves:['e4','c5']});
 assert.equal(restored.gameId,id);assert.deepEqual(restored.moves,['e4','c5']);
 assert.equal(restoreSession(incoming,{gameId:'other',moves:['e4']}),incoming);
 assert.equal(restoreSession(incoming,{gameId:id,moves:['illegal']}),incoming);
 assert.equal(restoreSession(restored,{gameId:id,moves:[]}),restored);
 assert.equal(restoreSession(restored,{gameId:id,moves:['d4','d5']}),restored);
});
test('incoming move results cannot swap games, rewind, or change a history branch',()=>{
 const session=new BoardSession();const current={...describePosition(['e4','c5']),gameId:id};session.replace(current);
 assert.equal(session.replace({...describePosition([]),gameId:id}),false);
 assert.equal(session.replace({...describePosition(['d4','d5']),gameId:id}),false);
 assert.equal(session.replace({...describePosition(['e4','c5','Nf3']),gameId:'another'}),false);
 assert.deepEqual(session.position.moves,['e4','c5']);
 assert.equal(session.replace({...describePosition(['e4','c5','Nf3']),gameId:id}),true);
 assert.equal(session.position.gameId,id);
});
