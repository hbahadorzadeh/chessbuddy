import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { describePosition, playMove, positionInput, moveInput } from './chess';

export const BOARD_URI = 'ui://chessbuddy/practice-board.html';
export function createChessServer(html: string) {
  const server = new McpServer({name:'chessbuddy', version:'0.1.0'});
  registerAppResource(server, 'practice-board', BOARD_URI, {}, async () => ({contents:[{
    uri:BOARD_URI, mimeType:RESOURCE_MIME_TYPE, text:html,
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}}},
  }]}));
  const annotations = {readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false};
  const meta = {ui:{resourceUri:BOARD_URI,visibility:['model','app']}};
  registerAppTool(server,'open_practice_board',{
    title:'Open chess practice board',
    description:'Open an ephemeral chess practice position. Supply the SAN move history from the latest board context to resume it, or omit moves to start fresh. This prototype has no saved games or engine opponent.',
    inputSchema:positionInput.shape, annotations, _meta:meta,
  }, async ({moves}: {moves:string[]}) => {
    try { const state=describePosition(moves); return {content:[{type:'text',text:`Practice board: ${state.turn} to move (${state.status}). No engine evaluation is available.`}],structuredContent:state}; }
    catch { return {isError:true,content:[{type:'text',text:'Invalid move history. Use the latest complete SAN history or start a fresh practice board.'}]}; }
  });
  registerAppTool(server,'play_practice_move',{
    title:'Play a practice move',
    description:'Calculate a legal next chess position using the complete current SAN move history and a SAN or UCI move. No persistent state is mutated. Use the latest widget context; ask the player if the intended move is ambiguous. This does not select an opponent move or provide engine analysis.',
    inputSchema:moveInput.shape, annotations, _meta:meta,
  }, async (args: {moves:string[];move:string}) => {
    try { const state=playMove(args); return {content:[{type:'text',text:`Played ${state.moves.at(-1)}. ${state.turn} to move (${state.status}).`}],structuredContent:state}; }
    catch { return {isError:true,content:[{type:'text',text:'Invalid history, illegal move, or finished position. No move was applied. Read the latest board context before retrying.'}]}; }
  });
  return server;
}
