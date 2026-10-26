import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createChessServer } from '@/lib/mcp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id','Access-Control-Expose-Headers':'MCP-Protocol-Version, Mcp-Session-Id'};
export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 16384) return new Response('Request too large',{status:413,headers:cors});
  const text = await request.text();
  if (text.length > 16384) return new Response('Request too large',{status:413,headers:cors});
  let body: unknown;
  try {body=JSON.parse(text);} catch {return new Response('Invalid JSON',{status:400,headers:cors});}
  const html = await readFile(join(process.cwd(),'public/chess-widget.html'),'utf8');
  const server = createChessServer(html);
  const transport = new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request,{parsedBody:body});
    const headers=new Headers(response.headers);
    for (const [key,value] of Object.entries(cors)) headers.set(key,value);
    return new Response(await response.arrayBuffer(),{status:response.status,headers});
  } finally {await server.close();}
}
export function OPTIONS() {return new Response(null,{status:204,headers:cors});}
export function GET() {return new Response('Use POST for stateless MCP requests.',{status:405,headers:{...cors,Allow:'POST, OPTIONS'}});}
export const DELETE = GET;
