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
  assert.equal(tools.tools.length,5);
  assert.match(BOARD_URI,/practice-board-v3\.html$/);
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
  assert.equal(duplicate.isError,true);
  const reopened=await client.callTool({name:'open_practice_board',arguments:{gameId}});
  assert.deepEqual((reopened.structuredContent as Record<string,unknown>).moves,['e4']);
  assert.equal((reopened.structuredContent as Record<string,unknown>).gameId,gameId);
  const missingId=await client.callTool({name:'play_practice_move',arguments:{move:'e5',expectedRevision:1}});
  assert.equal(missingId.isError,true);
  const tools=await client.listTools();
  for(const t of tools.tools.filter(t=>!['new_game','open_practice_board'].includes(t.name)))assert.equal(t._meta?.ui,undefined);
 }finally{await client.close();await server.close();}
});
