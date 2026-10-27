import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createChessServer,BOARD_URI} from '../lib/mcp';

test('MCP handshake, tool discovery, embedded resource, and legal/illegal moves',async()=>{
 const server=createChessServer('<html><body>board</body></html>');
 const client=new Client({name:'test',version:'1.0.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(a);await client.connect(b);
 try {
  const tools=await client.listTools();
  assert.equal(tools.tools.length,18);
  assert.match(BOARD_URI,/practice-board-v5\.html$/);
  assert.equal((tools.tools[0]._meta?.ui as {resourceUri:string}).resourceUri,BOARD_URI);
  assert.equal(tools.tools.find(t=>t.name==='play_practice_move')?._meta?.ui,undefined);
  const resource=await client.readResource({uri:BOARD_URI});
  assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
  const opened=await client.callTool({name:'new_game',arguments:{}});
  assert.equal((opened.structuredContent as Record<string,unknown>)?.revision,0);
  const gameId=(opened.structuredContent as Record<string,unknown>).gameId;
  const moved=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:0,move:'e4'}});
  assert.equal((moved.structuredContent as Record<string,unknown>)?.turn,'Black');
  assert.deepEqual((moved.structuredContent as Record<string,unknown>)?.moves,['e4']);
  const advice=await client.callTool({name:'get_chess_guidance',arguments:{gameId,expectedRevision:1}});
  assert.equal((advice.structuredContent as Record<string,unknown>).gameId,gameId);
  assert.ok((advice.structuredContent as {openingCandidates:{san:string}[]}).openingCandidates.some(m=>m.san==='e5'));
  const stale=await client.callTool({name:'get_chess_guidance',arguments:{gameId,expectedRevision:0}});assert.equal(stale.isError,true);
  const replay=await client.callTool({name:'create_replay',arguments:{gameId,startPly:1}});
  const replayId=(replay.structuredContent as {replayId:string}).replayId;
  assert.equal((replay.structuredContent as {originGameId:string}).originGameId,gameId);
  await client.callTool({name:'seek_replay',arguments:{replayId,ply:0,expectedRevision:0}});
  const replayAdvice=await client.callTool({name:'get_replay_guidance',arguments:{replayId,ply:1}});assert.equal((replayAdvice.structuredContent as {ply:number}).ply,1);
  const active=await client.callTool({name:'read_practice_board',arguments:{gameId}});assert.deepEqual((active.structuredContent as {moves:string[]}).moves,['e4']);
  const catalogue=await client.readResource({uri:'chessbuddy://knowledge/guide'});assert.equal(JSON.parse((catalogue.contents[0] as {text:string}).text).openingLines.length,20);
  const illegal=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:1,move:'e4'}});
  assert.equal(illegal.isError,true);
 }finally{await client.close();await server.close();}
});

test('live board MCP tools share state and replies never have UI rendering metadata',async()=>{
 const data=new Map<string, {moves:string[];revision:number}>();
 const store={async create(k:string,v:{moves:string[];revision:number}){data.set(k,v);},async read(k:string){return data.get(k)??null;},async compareAndSwap(k:string,r:number,v:{moves:string[];revision:number}){if(data.get(k)?.revision!==r)return false;data.set(k,v);return true;}};
 const server=createChessServer('<html>board</html>',store);
 const client=new Client({name:'live-test',version:'1.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{
  const opened=await client.callTool({name:'new_game',arguments:{}});
  const gameId=(opened.structuredContent as Record<string,unknown>).gameId;
  assert.equal(typeof gameId,'string');
  const moved=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:0,move:'e4'}});
  assert.equal(moved.isError,undefined);
  const read=await client.callTool({name:'read_practice_board',arguments:{gameId}});
  assert.deepEqual((read.structuredContent as Record<string,unknown>).moves,['e4']);
  const duplicate=await client.callTool({name:'play_practice_move',arguments:{gameId,expectedRevision:0,move:'e4'}});
  assert.equal(duplicate.isError,undefined);
  assert.equal((duplicate.structuredContent as {revision:number}).revision,1);
  const reopened=await client.callTool({name:'open_practice_board',arguments:{gameId}});
  assert.deepEqual((reopened.structuredContent as Record<string,unknown>).moves,['e4']);
  assert.equal((reopened.structuredContent as Record<string,unknown>).gameId,gameId);
  const missingId=await client.callTool({name:'play_practice_move',arguments:{move:'e5',expectedRevision:1}});
  assert.equal(missingId.isError,true);
  const tools=await client.listTools();
  for(const t of tools.tools.filter(t=>!['new_game','open_practice_board','create_replay','create_multiplayer_game','join_multiplayer_game','open_multiplayer_game'].includes(t.name)))assert.equal(t._meta?.ui,undefined);
 }finally{await client.close();await server.close();}
});

test('cold MCP instances recover from snapshots and missing history returns a recovery result, not a tool failure',async()=>{
 const {createMemoryBoardStore}=await import('../lib/memory-board-store');
 const {liveBoards}=await import('../lib/live-board');
 const {gameSnapshot}=await import('../lib/game-snapshot');
 const original=await liveBoards(createMemoryBoardStore()).open([]);
 async function invoke(name:string,args:Record<string,unknown>){
  const server=createChessServer('<html>board</html>',createMemoryBoardStore());
  const client=new Client({name:'cold-instance-test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
  try{return await client.callTool({name,arguments:args});}finally{await client.close();await server.close();}
 }
 const unavailable=await invoke('read_practice_board',{gameId:original.gameId});
 assert.equal(unavailable.isError,undefined);assert.equal((unavailable.structuredContent as {status:string}).status,'recovery_required');
 const advice=await invoke('get_chess_guidance',{gameId:original.gameId,expectedRevision:0,snapshot:gameSnapshot(original)});assert.equal(advice.isError,undefined);
 const moved=await invoke('play_practice_move',{gameId:original.gameId,expectedRevision:0,move:'e4',snapshot:gameSnapshot(original)});
 const position=moved.structuredContent as unknown as typeof original;assert.equal(position.gameId,original.gameId);assert.deepEqual(position.moves,['e4']);
 const read=await invoke('read_practice_board',{gameId:original.gameId,snapshot:gameSnapshot(position)});assert.deepEqual((read.structuredContent as {moves:string[]}).moves,['e4']);
 const replay=await invoke('create_replay',{gameId:original.gameId,snapshot:gameSnapshot(position)});assert.equal((replay.structuredContent as {originGameId:string}).originGameId,original.gameId);
 const malformed=await invoke('read_practice_board',{gameId:original.gameId,snapshot:{gameId:original.gameId}});assert.equal(malformed.isError,true);
});
