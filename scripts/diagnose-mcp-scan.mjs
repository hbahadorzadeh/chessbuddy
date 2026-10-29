import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url='https://chessbuddy-self.vercel.app/mcp';
const report={endpoint:url,checks:[],interpretation:'Independent HTTP/MCP checks cannot establish that the OpenAI Platform scanner completed or identify its private findings.'};
let id=1;
const common={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
async function request(name,{method='POST',headers={},body,expect=[200]}={}){
 const start=performance.now();
 let record={name,method};
 try{
  const response=await fetch(url,{method,headers:{...common,...headers},body,signal:AbortSignal.timeout(20000)});
  const text=await response.text();let json;try{json=JSON.parse(text);}catch{}
  record={...record,status:response.status,milliseconds:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),contentType:response.headers.get('content-type'),vercelId:response.headers.get('x-vercel-id'),rpcError:json?.error?{code:json.error.code,message:json.error.message}:undefined,passed:expect.includes(response.status)};
  report.checks.push(record);
  assert.ok(record.passed,name+': unexpected HTTP '+response.status);
  return json;
 }catch(error){
  if(!report.checks.includes(record))report.checks.push({...record,passed:false,milliseconds:Math.round(performance.now()-start),failure:error.name+': '+error.message});
  throw error;
 }
}
const rpc=(method,params={},notification=false)=>JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:id++}),method,params});
await mkdir('dist',{recursive:true});
try{
 await request('Stateless GET without SSE is explicitly unsupported',{method:'GET',expect:[405]});
 await request('CORS preflight',{method:'OPTIONS',expect:[204]});
 const init=await request('Initialize anonymously',{body:rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'ChessBuddy-scan-diagnostic',version:'1.0'}})});
 assert.ok(init.result?.protocolVersion);report.negotiatedVersion=init.result.protocolVersion;report.serverInfo=init.result.serverInfo;report.serverInstructions=init.result.instructions;
 const protocol={'MCP-Protocol-Version':report.negotiatedVersion};
 await request('Initialized notification',{headers:protocol,body:rpc('notifications/initialized',{},true),expect:[202]});
 const tools=await request('Discover tools',{headers:protocol,body:rpc('tools/list')});
 assert.equal(tools.result?.tools?.length,18);report.tools=tools.result.tools;
 for(const tool of report.tools)for(const key of ['readOnlyHint','openWorldHint','destructiveHint'])assert.equal(typeof tool.annotations?.[key],'boolean',tool.name+' '+key);
 await request('List resources',{headers:protocol,body:rpc('resources/list')});
 await request('List resource templates',{headers:protocol,body:rpc('resources/templates/list')});
 for(const [name,agent]of [['Generic diagnostic client','ChessBuddy-MCP-Diagnostics/1.0'],['OpenAI user-agent compatibility','OpenAI'],['ChatGPT user-agent compatibility','ChatGPT-User']]){
  const response=await request(name,{headers:{...protocol,'User-Agent':agent,Origin:'https://chatgpt.com'},body:rpc('tools/list')});assert.equal(response.result?.tools?.length,18);
 }
 const simultaneous=await Promise.all(Array.from({length:4},(_,n)=>request('Concurrent tool discovery '+(n+1),{headers:protocol,body:rpc('tools/list')})));
 for(const response of simultaneous)assert.equal(response.result?.tools?.length,18);
 for(const uri of ['ui://chessbuddy/practice-board-v5.html','ui://chessbuddy/replay-v1.html','ui://chessbuddy/multiplayer-v1.html']){
  const r=await request('Read '+uri,{headers:protocol,body:rpc('resources/read',{uri})});assert.ok(r.result?.contents?.[0]?.text.includes('<div id="root">'));
 }
 await request('Malformed JSON is rejected without server crash',{body:'{not json',expect:[400]});
 await request('JSON-only Accept is rejected per strict Streamable HTTP negotiation',{headers:{Accept:'application/json'},body:rpc('tools/list'),expect:[406]});
 report.transportPassed=true;
}catch(error){report.transportPassed=false;report.failure=error.message;process.exitCode=1;}
finally{
 await writeFile('dist/mcp-scan-diagnostics.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({transportPassed:report.transportPassed,negotiatedVersion:report.negotiatedVersion,checks:report.checks,failure:report.failure},null,2));
}
