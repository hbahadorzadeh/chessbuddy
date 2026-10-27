import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createChessServer} from '../lib/mcp';
import {multiplayerGames,type MultiplayerView} from '../lib/multiplayer';
import {createMemoryMultiplayerStore} from '../lib/multiplayer-store';
import {MULTIPLAYER_URI} from '../lib/multiplayer-mcp';
test('two independent MCP connections share a human game with private access and headless moves',async()=>{
 const store=createMemoryMultiplayerStore();const games=multiplayerGames(()=>store);
 async function connect(){const server=createChessServer('<html>solo</html>',undefined,'<html>replay</html>','<html>shared</html>',games);const client=new Client({name:'multiplayer-test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);return {client,server};}
 const a=await connect(),b=await connect();
 try{
  const tools=(await a.client.listTools()).tools;assert.equal(tools.length,18);assert.equal(tools.find(t=>t.name==='play_multiplayer_move')?._meta?.ui,undefined);
  const resource=await b.client.readResource({uri:MULTIPLAYER_URI});assert.match((resource.contents[0] as {text:string}).text,/shared/);
  const created=await a.client.callTool({name:'create_multiplayer_game',arguments:{coachingMode:'hints'}});assert.ok(!created.isError);
  const owner=created.structuredContent as MultiplayerView&{playerCode:string;invitationLink:string};assert.ok(!owner.invitationLink.includes(owner.playerCode));
  const joined=await b.client.callTool({name:'join_multiplayer_game',arguments:{gameId:owner.gameId,coachingMode:'explanations'}});assert.ok(!joined.isError);const other=joined.structuredContent as MultiplayerView&{playerCode:string};
  const white={gameId:owner.gameId,code:owner.playerCode},black={gameId:owner.gameId,code:other.playerCode};
  const opened=await b.client.callTool({name:'open_multiplayer_game',arguments:black});assert.deepEqual(opened._meta?.gameAccess,black);
  const moved=await a.client.callTool({name:'play_multiplayer_move',arguments:{...white,expectedRevision:0,requestId:randomUUID(),move:'e4'}});assert.ok(!moved.isError);
  const read=await b.client.callTool({name:'read_multiplayer_game',arguments:black});assert.deepEqual((read.structuredContent as MultiplayerView).position.moves,['e4']);assert.ok(!JSON.stringify(read.structuredContent).includes(owner.playerCode));
  const advice=await b.client.callTool({name:'get_multiplayer_guidance',arguments:{...black,expectedRevision:1}});assert.equal((advice.structuredContent as Record<string,unknown>)?.coachingMode,'explanations');assert.equal((advice.structuredContent as Record<string,unknown>)?.openingCandidates,undefined);
  const noCode=await a.client.callTool({name:'play_multiplayer_move',arguments:{gameId:owner.gameId,expectedRevision:1,requestId:randomUUID(),move:'e5'}});assert.equal(noCode.isError,true);
  const shared=await a.client.callTool({name:'manage_multiplayer_sharing',arguments:{...white,kind:'spectator',enabled:true}});const spectator={gameId:owner.gameId,code:(shared.structuredContent as Record<string,unknown>)?.spectatorCode};
  const view=await b.client.callTool({name:'open_multiplayer_game',arguments:spectator});assert.equal((view.structuredContent as Record<string,unknown>)?.role,'spectator');
  const attack=await b.client.callTool({name:'play_multiplayer_move',arguments:{...spectator,expectedRevision:1,requestId:randomUUID(),move:'e5'}});assert.equal(attack.isError,true);
 }finally{await Promise.all([a.client.close(),b.client.close()]);await Promise.all([a.server.close(),b.server.close()]);}
});
