import { z } from 'zod';
import {memoryBoardStore} from './memory-board-store';
import {liveBoards,type BoardStore} from './live-board';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { playMove, positionInput, moveInput } from './chess';

export const BOARD_URI = 'ui://chessbuddy/practice-board-v2.html';
export function createChessServer(html: string, store:BoardStore=memoryBoardStore) {
  const boards=liveBoards(store);
  const boardKey=z.string().regex(/^[a-f0-9]{64}$/);
  const server = new McpServer({name:'chessbuddy', version:'0.2.0'});
  registerAppResource(server, 'practice-board', BOARD_URI, {}, async () => ({contents:[{
    uri:BOARD_URI, mimeType:RESOURCE_MIME_TYPE, text:html,
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}},"openai/ui":{availableDisplayModes:["inline","fullscreen"],preferredDisplayMode:"fullscreen"}},
  }]}));
  const annotations = {readOnlyHint:true, destructiveHint:false, idempotentHint:true, openWorldHint:false};
  const meta = {ui:{resourceUri:BOARD_URI,visibility:['model','app']}};
  registerAppTool(server,'open_practice_board',{
    title:'Open chess practice board',
    description:'Open an ephemeral chess practice position. Supply the SAN move history from the latest board context to resume it, or omit moves to start fresh. Use this only to open a board or explicitly start over, never after each move. When the open board exposes chessbuddy_play_on_board, use that to play on the existing board. This prototype has no saved games or engine opponent.',
    inputSchema:positionInput.shape, annotations:{...annotations,readOnlyHint:false,idempotentHint:false}, _meta:meta,
  }, async ({moves}: {moves:string[]}) => {
    try { const state=await boards.open(moves); return {content:[{type:'text',text:`Practice board: ${state.turn} to move (${state.status}). No engine evaluation is available.`}],structuredContent:state}; }
    catch { return {isError:true,content:[{type:'text',text:'Could not open the board: invalid move history or live storage unavailable. Preserve the history and retry.'}]}; }
  });
  server.registerTool('play_practice_move',{
    title:'Play a practice move',
    description:'Play on an existing live board by supplying boardKey and expectedRevision from the latest context; use read_practice_board to refresh stale state. This updates the existing board without drawing a new one. Never call open_practice_board for an ordinary reply. Without boardKey, calculate a legal next chess position using the complete current SAN move history and a SAN or UCI move. Live-board state is best-effort process memory; stateless calculations do not mutate it. Use the latest widget context; ask the player if the intended move is ambiguous. When playing as the opponent, call this tool to commit your chosen move before telling the player you played it. A text announcement alone does not move a piece. This tool does not choose a move or provide engine analysis.',
    inputSchema:{...moveInput.shape,boardKey:boardKey.optional(),expectedRevision:z.number().int().min(0).optional()}, annotations:{...annotations,readOnlyHint:false},
  }, async (args: {moves:string[];move:string;boardKey?:string;expectedRevision?:number}) => {
    try { const state=args.boardKey?await (async()=>{if(!boards)throw new Error('Live boards unavailable');if(args.expectedRevision===undefined)throw new Error('Expected revision required');return boards.play(args.boardKey!,args.expectedRevision,args.move);})():playMove(args); return {content:[{type:'text',text:`Played ${state.moves.at(-1)}. ${state.turn} to move (${state.status}).`}],structuredContent:state}; }
    catch { return {isError:true,content:[{type:'text',text:'Move rejected: illegal move, stale revision, finished position, or live storage unavailable. If you supplied boardKey, call read_practice_board and use its latest revision before retrying. No replacement board is needed.'}]}; }
  });
  server.registerTool('read_practice_board',{
    title:'Read existing chess board',description:'Read the latest state of an already open live board without drawing another board. Use its boardKey from the latest context. Never guess a board key.',inputSchema:{boardKey},annotations,
  },async({boardKey:key}:{boardKey:string})=>{
    try{if(!boards)throw new Error('Live board storage is not configured.');return {content:[{type:'text',text:'Current live board position.'}],structuredContent:await boards.read(key)};}
    catch{return {isError:true,content:[{type:'text',text:'BOARD_UNAVAILABLE: this Vercel instance has no position for that key. Keep the displayed history and use the board’s Recover from history button. Memory is best-effort and may reset or differ between instances.'}]};}
  });
  server.registerTool('recover_practice_board',{
    title:'Recover the open board from its history',
    description:'After memory loss, recover the current open board from its complete SAN history. This returns a new board key without drawing another board. Use only when recovery is explicitly requested; a pending reply to the old key may be lost.',
    inputSchema:positionInput.shape,annotations:{...annotations,readOnlyHint:false,idempotentHint:false},
  },async({moves}:{moves:string[]})=>{
    try{return {content:[{type:'text',text:'Recovered from the supplied history. Use this new board key from now on.'}],structuredContent:await boards.open(moves)};}
    catch{return {isError:true,content:[{type:'text',text:'Could not recover: invalid move history.'}]};}
  });
  return server;
}
