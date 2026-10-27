import {registerMultiplayer} from './multiplayer-mcp';
import {type MultiplayerService} from './multiplayer';
import {gameSnapshotSchema,type GameSnapshot} from './game-snapshot';
import {replayStore,replayInput} from './replay';
import {chessGuidance,knowledgeCatalogue} from './chess-guidance';
import {timingSchema,type GameTiming} from './game-stats';
import { z } from 'zod';
import {memoryBoardStore} from './memory-board-store';
import {liveBoards,type BoardStore} from './live-board';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { positionInput } from './chess';

export const BOARD_URI = 'ui://chessbuddy/practice-board-v5.html';
export function createChessServer(html: string, store:BoardStore=memoryBoardStore,replayHtml=html,multiplayerHtml=html,multiplayer?:MultiplayerService) {
  const boards=liveBoards(store);
  const gameId=z.string().uuid();
  const revision=z.number().int().min(0).max(400);
  const server = new McpServer({name:'chessbuddy', version:'0.6.0'}, {instructions:'For two-human games use ONLY multiplayer tools, never practice tools or snapshot recovery. ChatGPT coaches the authenticated user privately and must not play as the other human. Respect explanations/hints/suggestions modes. Share invitation or spectator links, never private player codes. Multiplayer uses app memory shared only within one Node process and expires seven days after creation; restart/other instances may make it unavailable. Before choosing an opponent move or teaching from this position, call get_chess_guidance with the current UUID and revision. Use exact-position opening matches and verified one-move tactics; these are authored notes, not engine evaluations. Give progressive hints without spoilers when asked. Always include the latest snapshot from board context in game reads, guidance, moves, resume, and game-based replay calls. A snapshot carries gameId, complete moves, timing and expiry so another Vercel instance can reconstruct the game. If no snapshot/history exists, ask for the history instead of inventing it. Each game has one immutable gameId UUID. Use new_game only when the user requests a new game. Resume with open_practice_board(gameId). Commit every announced move through play_practice_move(gameId, expectedRevision, move); never just describe an uncommitted move. Read or recover the same gameId when memory is unavailable. Do not create, reopen, or replace a board after an ordinary opponent move.'});
  registerAppResource(server,'practice-board',BOARD_URI,{},async()=>({contents:[{
    uri:BOARD_URI,mimeType:RESOURCE_MIME_TYPE,text:html,
    _meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}},'openai/ui':{availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'fullscreen'}},
  }]}));
  server.registerResource('chess-knowledge','chessbuddy://knowledge/guide',{mimeType:'application/json',description:'Original teaching notes and standard opening continuations. No engine/database verification or professional-strength guarantee.'},async()=>({contents:[{uri:'chessbuddy://knowledge/guide',mimeType:'application/json',text:JSON.stringify(knowledgeCatalogue)}]}));
  server.registerResource('replay-board','ui://chessbuddy/replay-v1.html',{mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{uri:'ui://chessbuddy/replay-v1.html',mimeType:RESOURCE_MIME_TYPE,text:replayHtml,_meta:{ui:{prefersBorder:true,csp:{connectDomains:[],resourceDomains:[]}},'openai/ui':{availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'fullscreen'}}}]}));
  const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
  const mutation={...readOnly,readOnlyHint:false};
  const meta={ui:{resourceUri:BOARD_URI,visibility:['model','app']}};
  const result=(state:Awaited<ReturnType<typeof boards.read>>,message:string)=>({content:[{type:'text' as const,text:`${message} Game ${state.gameId}, revision ${state.revision}; ${state.turn} to move (${state.status}).`}],structuredContent:state});
  const failure=(error:unknown)=>{
    const message=error instanceof Error?error.message:'Game operation failed. Keep the same gameId and displayed history.';
    if(message.startsWith('GAME_UNAVAILABLE'))return {content:[{type:'text' as const,text:message}],structuredContent:{status:'recovery_required',message}};
    return {isError:true,content:[{type:'text' as const,text:message}]};
  };
  registerAppTool(server,'new_game',{
    title:'Start a new chess game',description:'Create a new game with a fresh UUID and open its board. Use once when the user explicitly requests a new game. Keep the returned gameId unchanged for all moves, reads, reopening, and recovery. This prototype uses best-effort app memory without an engine.',
    inputSchema:{},annotations:{...mutation,idempotentHint:false},_meta:meta,
  },async()=>{try{return result(await boards.open([]),'New game started.');}catch(e){return failure(e);}});
  registerAppTool(server,'open_practice_board',{
    title:'Resume existing chess game',description:'Reopen an existing game using its UUID; never creates a game or resets history. Do not call after ordinary moves. If memory is missing, recover the same gameId using known history.',
    inputSchema:{gameId,snapshot:gameSnapshotSchema.optional()},annotations:readOnly,_meta:meta,
  },async({gameId:id,snapshot}:{gameId:string;snapshot?:GameSnapshot})=>{try{return result(await boards.read(id,snapshot),'Existing game resumed.');}catch(e){return failure(e);}});
  server.registerTool('play_practice_move',{
    title:'Commit chess move to existing game',description:'Commit one legal SAN or UCI move to gameId at expectedRevision. Both fields are required; do not invent them. Include the latest snapshot from board context so cache loss can be recovered without an external store. Repeating the same move/revision returns the committed state without adding a move. This updates the existing board without rendering a new one. Call successfully before announcing that you played. On conflict read the same game; on memory loss recover the same gameId. Never call new_game for a reply.',
    inputSchema:{gameId,snapshot:gameSnapshotSchema.optional(),expectedRevision:revision,move:z.string().min(2).max(12)},annotations:mutation,
  },async({gameId:id,expectedRevision,move,snapshot}:{gameId:string;expectedRevision:number;move:string;snapshot?:GameSnapshot})=>{try{return result(await boards.play(id,expectedRevision,move,snapshot),'Move committed.');}catch(e){return failure(e);}});
  server.registerTool('read_practice_board',{
    title:'Read existing chess game',description:'Read authoritative position for this gameId without rendering or replacing the board. If unavailable, preserve history and recover the SAME gameId.',inputSchema:{gameId,snapshot:gameSnapshotSchema.optional()},annotations:readOnly,
  },async({gameId:id,snapshot}:{gameId:string;snapshot?:GameSnapshot})=>{try{return result(await boards.read(id,snapshot),'Current game.');}catch(e){return failure(e);}});
  server.registerTool('recover_practice_board',{
    title:'Recover same chess game from history',description:'Recover the existing gameId from complete SAN moves and matching expectedRevision after memory loss. UUID remains unchanged. Never overwrites newer or conflicting history. Does not render another board. Use only when recovery is requested.',
    inputSchema:{gameId,expectedRevision:revision,moves:positionInput.shape.moves,timing:timingSchema.optional()},annotations:mutation,
  },async({gameId:id,expectedRevision,moves,timing}:{gameId:string;expectedRevision:number;moves:string[];timing?:GameTiming})=>{try{return result(await boards.recover(id,moves,expectedRevision,timing),'Same game recovered.');}catch(e){return failure(e);}});
  server.registerTool('get_chess_guidance',{
    title:'Consult chess knowledge and position guidance',description:'Read-only advice for the exact game/revision. Consult before choosing an opponent move. Returns legal curated opening candidates, verified mate-in-one moves, and original teaching notes. Outside covered positions it gives principles, not invented book moves. Use mode hint with question/concept before revealing moves. Optional candidateMove checks legality and immediate mating replies only; no engine score or best-move guarantee.',
    inputSchema:{gameId,snapshot:gameSnapshotSchema.optional(),expectedRevision:revision,mode:z.enum(['play','hint','teach']).default('play'),hintLevel:z.enum(['question','concept','move']).default('question'),topic:z.string().max(40).optional(),candidateMove:z.string().min(2).max(12).optional()},annotations:readOnly,
  },async({gameId:id,expectedRevision,snapshot,...options}:{gameId:string;snapshot?:GameSnapshot;expectedRevision:number;mode:'play'|'hint'|'teach';hintLevel:'question'|'concept'|'move';topic?:string;candidateMove?:string})=>{
    try{const state=await boards.read(id,snapshot);if(state.revision!==expectedRevision)throw new Error('REVISION_CONFLICT: refresh this game before asking for guidance.');return {content:[{type:'text',text:'Authored chess guidance for the exact current position; no engine evaluation.'}],structuredContent:{gameId:id,...chessGuidance(state.moves,options)}};}
    catch(e){return failure(e);}
  });
  const replayId=z.string().uuid();
  const replayResult=(state:ReturnType<typeof replayStore.read>)=>({content:[{type:'text' as const,text:`Replay ${state.replayId}: ply ${state.cursor}/${state.moves.length}. FEN ${state.frames[state.cursor].fen}. This is a replay, not an active game.`}],structuredContent:state});
  registerAppTool(server,'create_replay',{
    title:'Open a chess replay',description:'Create a separate replay from exactly one of gameId (snapshot current game), PGN, or a move list. Supply initialFen for a continuation that starts mid-game, and startPly to begin viewing later. Ply 0 always means the supplied initial position. Optional durationsMs align one-to-one with moves; PGN %emt comments are used when present. Never invent famous-game provenance. Does not change the active game.',
    inputSchema:{...replayInput.shape,gameId:gameId.optional(),snapshot:gameSnapshotSchema.optional()},annotations:{...mutation,idempotentHint:false},_meta:{ui:{resourceUri:'ui://chessbuddy/replay-v1.html',visibility:['model','app']}},
  },async(args:z.infer<typeof replayInput>&{gameId?:string;snapshot?:GameSnapshot})=>{
    try{
      if(args.gameId){if(args.pgn!==undefined||args.moves!==undefined||args.initialFen!==undefined)throw new Error('Use gameId alone as the replay source, without PGN/moves/initialFen.');const game=await boards.read(args.gameId,args.snapshot);const replay=replayStore.create({...args,moves:game.moves,durationsMs:args.durationsMs??game.timing?.moveTimesMs},args.gameId);return replayResult(replay);}
      return replayResult(replayStore.create(args));
    }catch(e){return failure(e);}
  });
  server.registerTool('read_replay',{title:'Read existing replay',description:'Read this replay and selected position without opening another view or changing the active game.',inputSchema:{replayId},annotations:readOnly},async({replayId:id}:{replayId:string})=>{try{return replayResult(replayStore.read(id));}catch(e){return failure(e);}});
  server.registerTool('seek_replay',{title:'Move replay cursor',description:'Jump the existing replay to a relative ply (0 is its supplied initial FEN). Updates the open replay view. Requires its latest replay revision. This never plays a move in an active game.',inputSchema:{replayId,ply:z.number().int().min(0).max(1000),expectedRevision:z.number().int().min(0)},annotations:mutation},async({replayId:id,ply,expectedRevision}:{replayId:string;ply:number;expectedRevision:number})=>{try{return replayResult(replayStore.seek(id,ply,expectedRevision));}catch(e){return failure(e);}});
  server.registerTool('get_replay_guidance',{title:'Explain a replay position',description:'Read-only teaching guidance for a chosen replay ply, using its actual starting FEN and history. Use for strategy reviews and famous-game PGNs; do not assume an imported game is historically authenticated. No engine evaluation.',inputSchema:{replayId,ply:z.number().int().min(0).max(1000),topic:z.string().max(40).optional()},annotations:readOnly},async({replayId:id,ply,topic}:{replayId:string;ply:number;topic?:string})=>{try{const replay=replayStore.read(id);if(ply>replay.moves.length)throw new Error('Replay ply outside range.');return {content:[{type:'text',text:'Teaching guidance for the requested replay position; no active game was changed.'}],structuredContent:{replayId:id,ply,gameSource:replay.source,initialFen:replay.initialFen,lastMove:replay.frames[ply],previousFen:ply>0?replay.frames[ply-1].fen:null,...chessGuidance(replay.moves.slice(0,ply),{initialFen:replay.initialFen,mode:'teach',topic}),revision:replay.revision}};}catch(e){return failure(e);}});
  registerMultiplayer(server,multiplayerHtml,multiplayer);
  return server;
}
