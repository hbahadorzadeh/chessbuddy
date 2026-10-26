import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin=new URL(process.argv[2] ?? 'http://127.0.0.1:3000');
const client=new Client({name:'chessbuddy-smoke',version:'0.1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('/mcp',origin)));
try {
 const tools=await client.listTools();assert.equal(tools.tools.length,10);
 const resource=await client.readResource({uri:'ui://chessbuddy/practice-board-v5.html'});
 assert.match(resource.contents[0].text,/<div id="root">/);
 const opened=await client.callTool({name:'new_game',arguments:{}});assert.equal(opened.structuredContent.revision,0);
 const gameId=opened.structuredContent.gameId;assert.equal(typeof gameId,'string');
 const advice=await client.callTool({name:'get_chess_guidance',arguments:{gameId,expectedRevision:0}});assert.equal(advice.structuredContent.gameId,gameId);assert.ok(advice.structuredContent.openingCandidates.length);
 const moved=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:0,move:'e2e4'}});assert.equal(moved.structuredContent.turn,'Black');
 const live=await client.callTool({name:'read_practice_board',arguments:{gameId}});assert.deepEqual(live.structuredContent.moves,['e4']);
 const resumed=await client.callTool({name:'open_practice_board',arguments:{gameId}});assert.equal(resumed.structuredContent.gameId,gameId);assert.deepEqual(resumed.structuredContent.moves,['e4']);
 const reply=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:1,move:'c5'}});assert.equal(reply.structuredContent.gameId,gameId);assert.deepEqual(reply.structuredContent.moves,['e4','c5']);
 const recovered=await client.callTool({name:'recover_practice_board',arguments:{gameId,expectedRevision:1,moves:['e4']}});assert.equal(recovered.structuredContent.gameId,gameId);assert.deepEqual(recovered.structuredContent.moves,['e4','c5']);
 const second=await client.callTool({name:'new_game',arguments:{}});assert.notEqual(second.structuredContent.gameId,gameId);
 const invalid=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:1,move:'e4'}});assert.equal(invalid.isError,true);
 assert.equal(reply.structuredContent.stats.white.moves,1);assert.equal(reply.structuredContent.stats.black.moves,1);assert.equal(reply.structuredContent.stats.moveLog.length,2);assert.ok(reply.structuredContent.stats.expiresAt>Date.now());
 const replay=await client.callTool({name:'create_replay',arguments:{gameId,startPly:1}});assert.equal(replay.structuredContent.cursor,1);assert.equal(replay.structuredContent.originGameId,gameId);
 const replayId=replay.structuredContent.replayId;const sought=await client.callTool({name:'seek_replay',arguments:{replayId,ply:2,expectedRevision:0}});assert.equal(sought.structuredContent.cursor,2);
 const review=await client.callTool({name:'get_replay_guidance',arguments:{replayId,ply:2}});assert.equal(review.structuredContent.fen,sought.structuredContent.frames[2].fen);
 const replayPage=await fetch(new URL('/replay',origin));assert.equal(replayPage.status,200);
 const board=await fetch(new URL('/board',origin));assert.equal(board.status,200);assert.match(await board.text(),/ChessBuddy practice board/);
 const local=await fetch(new URL('/api/demo',origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moves:['e4'],move:'e5'})});assert.equal(local.status,200);assert.deepEqual((await local.json()).moves,['e4','e5']);
 console.log('HTTP smoke passed: MCP initialization, tools, board resource, legal/illegal moves, and browser API.');
}finally{await client.close();}
