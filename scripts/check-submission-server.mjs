import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client=new Client({name:'chessbuddy-submission-validation',version:'0.6.0'});
const deadline=setTimeout(()=>{console.error('Live MCP verification timed out.');process.exit(1);},120000);
deadline.unref();
try {
 await client.connect(new StreamableHTTPClientTransport(new URL('https://chessbuddy-self.vercel.app/mcp')));
 const listed=await client.listTools();
 assert.equal(listed.tools.length,18);
 for(const t of listed.tools)for(const key of ['readOnlyHint','openWorldHint','destructiveHint'])assert.equal(typeof t.annotations?.[key],'boolean',t.name+' '+key);
 const resources=['ui://chessbuddy/practice-board-v5.html','ui://chessbuddy/replay-v1.html','ui://chessbuddy/multiplayer-v1.html'];
 for(const uri of resources){const r=await client.readResource({uri});assert.match(r.contents[0].text,/<div id="root">/);}
 const report={endpoint:'https://chessbuddy-self.vercel.app/mcp',toolCount:listed.tools.length,tools:listed.tools.map(t=>({name:t.name,annotations:t.annotations})),resources,accountAuthentication:'none',mutatingToolsExecuted:false,inHostReviewCasesRun:false};
 await writeFile('dist/live-mcp-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('Live MCP handshake, 18 tools, boolean annotations and three app resources passed.');
} finally {clearTimeout(deadline);await client.close();}
