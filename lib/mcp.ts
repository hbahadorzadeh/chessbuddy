import { z } from 'zod';
import {memoryBoardStore} from './memory-board-store';
import {liveBoards,type BoardStore} from './live-board';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { positionInput } from './chess';

export const BOARD_URI = 'ui://chessbuddy/practice-board-v3.html';
export function createChessServer(html: string, store:BoardStore=memoryBoardStore) {
  const boards=liveBoards(store);
  const gameId=z.string().uuid();
  const revision=z.number().int().min(0).max(400);
  const server = new McpServer({name:'chessbuddy', version:'0.3.0'}, {instructions:'Each game has one immutable gameId UUID. Use new_game only when the user requests a new game. Resume with open_practice_board(gameId). Commit every announced move through play_practice_move(gameId, expectedRevision, move); never just describe an uncommitted move. Read or recover the same gameId when memory is unavailable. Do not create, reopen, or replace a board after an ordinary opponent move.'});
  registerAppResource(server,'practice-board',BOARD_URI,{},async()=>({contents:[{
    uri:BOARD_URI,mimeType:RESOURCE_MIME_TYPE,text:html,
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}},'openai/ui':{availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'fullscreen'}},
  }]}));
  const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
  const mutation={...readOnly,readOnlyHint:false};
  const meta={ui:{resourceUri:BOARD_URI,visibility:['model','app']}};
  const result=(state:Awaited<ReturnType<typeof boards.read>>,message:string)=>({content:[{type:'text' as const,text:`${message} Game ${state.gameId}, revision ${state.revision}; ${state.turn} to move (${state.status}).`}],structuredContent:state});
  const failure=(error:unknown)=>({isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message:'Game operation failed. Keep the same gameId and displayed history.'}]});
  registerAppTool(server,'new_game',{
    title:'Start a new chess game',description:'Create a new game with a fresh UUID and open its board. Use once when the user explicitly requests a new game. Keep the returned gameId unchanged for all moves, reads, reopening, and recovery. This prototype uses best-effort app memory without an engine.',
    inputSchema:{},annotations:{...mutation,idempotentHint:false},_meta:meta,
  },async()=>{try{return result(await boards.open([]),'New game started.');}catch(e){return failure(e);}});
  registerAppTool(server,'open_practice_board',{
    title:'Resume existing chess game',description:'Reopen an existing game using its UUID; never creates a game or resets history. Do not call after ordinary moves. If memory is missing, recover the same gameId using known history.',
    inputSchema:{gameId},annotations:readOnly,_meta:meta,
  },async({gameId:id}:{gameId:string})=>{try{return result(await boards.read(id),'Existing game resumed.');}catch(e){return failure(e);}});
  server.registerTool('play_practice_move',{
    title:'Commit chess move to existing game',description:'Commit one legal SAN or UCI move to gameId at expectedRevision. Both fields are required; do not invent them. This updates the existing board without rendering a new one. Call successfully before announcing that you played. On conflict read the same game; on memory loss recover the same gameId. Never call new_game for a reply.',
    inputSchema:{gameId,expectedRevision:revision,move:z.string().min(2).max(12)},annotations:mutation,
  },async({gameId:id,expectedRevision,move}:{gameId:string;expectedRevision:number;move:string})=>{try{return result(await boards.play(id,expectedRevision,move),'Move committed.');}catch(e){return failure(e);}});
  server.registerTool('read_practice_board',{
    title:'Read existing chess game',description:'Read authoritative position for this gameId without rendering or replacing the board. If unavailable, preserve history and recover the SAME gameId.',inputSchema:{gameId},annotations:readOnly,
  },async({gameId:id}:{gameId:string})=>{try{return result(await boards.read(id),'Current game.');}catch(e){return failure(e);}});
  server.registerTool('recover_practice_board',{
    title:'Recover same chess game from history',description:'Recover the existing gameId from complete SAN moves and matching expectedRevision after memory loss. UUID remains unchanged. Never overwrites newer or conflicting history. Does not render another board. Use only when recovery is requested.',
    inputSchema:{gameId,expectedRevision:revision,moves:positionInput.shape.moves},annotations:mutation,
  },async({gameId:id,expectedRevision,moves}:{gameId:string;expectedRevision:number;moves:string[]})=>{try{return result(await boards.recover(id,moves,expectedRevision),'Same game recovered.');}catch(e){return failure(e);}});
  return server;
}
