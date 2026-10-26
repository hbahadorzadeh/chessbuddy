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
  assert.equal(tools.tools.length,2);
  assert.equal((tools.tools[0]._meta?.ui as {resourceUri:string}).resourceUri,BOARD_URI);
  const resource=await client.readResource({uri:BOARD_URI});
  assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
  const opened=await client.callTool({name:'open_practice_board',arguments:{}});
  assert.equal((opened.structuredContent as Record<string,unknown>)?.revision,0);
  const moved=await client.callTool({name:'play_practice_move',arguments:{moves:[],move:'e4'}});
  assert.equal((moved.structuredContent as Record<string,unknown>)?.turn,'Black');
  assert.deepEqual((moved.structuredContent as Record<string,unknown>)?.moves,['e4']);
  const illegal=await client.callTool({name:'play_practice_move',arguments:{moves:[],move:'e5'}});
  assert.equal(illegal.isError,true);
 }finally{await client.close();await server.close();}
});
