import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin=new URL(process.argv[2] ?? 'http://127.0.0.1:3000');
const client=new Client({name:'chessbuddy-smoke',version:'0.1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('/mcp',origin)));
try {
 const tools=await client.listTools();assert.equal(tools.tools.length,2);
 const resource=await client.readResource({uri:'ui://chessbuddy/practice-board.html'});
 assert.match(resource.contents[0].text,/<div id="root">/);
 const opened=await client.callTool({name:'open_practice_board',arguments:{}});assert.equal(opened.structuredContent.revision,0);
 const moved=await client.callTool({name:'play_practice_move',arguments:{moves:[],move:'e2e4'}});assert.equal(moved.structuredContent.turn,'Black');
 const invalid=await client.callTool({name:'play_practice_move',arguments:{moves:[],move:'e5'}});assert.equal(invalid.isError,true);
 const board=await fetch(new URL('/board',origin));assert.equal(board.status,200);assert.match(await board.text(),/ChessBuddy practice board/);
 const local=await fetch(new URL('/api/demo',origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moves:['e4'],move:'e5'})});assert.equal(local.status,200);assert.deepEqual((await local.json()).moves,['e4','e5']);
 console.log('HTTP smoke passed: MCP initialization, tools, board resource, legal/illegal moves, and browser API.');
}finally{await client.close();}
