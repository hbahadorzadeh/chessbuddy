import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {describePosition,playMove} from './chess';
import {chessGuidance} from './chess-guidance';
import {initialTiming,commitTiming,gameStats,GAME_RETENTION_MS,type GameTiming} from './game-stats';
import {type MultiplayerStore,multiplayerStore} from './multiplayer-store';
export const coachingMode=z.enum(['explanations','hints','suggestions']);
export type CoachingMode=z.infer<typeof coachingMode>;
export const accessSchema=z.object({gameId:z.string().uuid(),code:z.string().regex(/^[A-Za-z0-9_-]{32}$/)});
export type GameAccess=z.infer<typeof accessSchema>;
type Seat='White'|'Black';
type SeatRecord={hash:string;coachingMode:CoachingMode};
export type SharedGame={version:number;gameId:string;expiresAt:number;createdAt:number;owner:Seat;invitationOpen:boolean;spectatorHash?:string;players:Partial<Record<Seat,SeatRecord>>;moves:string[];timing:GameTiming;receipts:{id:string;seat:Seat;revision:number;move:string}[]};
const hash=(code:string)=>createHash('sha256').update(code).digest('hex');
const code=()=>randomBytes(24).toString('base64url');
const matches=(value:string,stored?:string)=>!!stored && timingSafeEqual(Buffer.from(hash(value),'hex'),Buffer.from(stored,'hex'));
export type MultiplayerService=ReturnType<typeof multiplayerGames>;
export function multiplayerGames(storage:()=>MultiplayerStore=multiplayerStore,now=Date.now){
 async function load(gameId:string){const raw=await storage().read(gameId);if(!raw||raw.expiresAt<=now())throw new Error('GAME_UNAVAILABLE: game does not exist or its seven-day retention ended.');return raw as SharedGame;}
 function player(game:SharedGame,credential:string):Seat|null{return (['White','Black'] as Seat[]).find(s=>matches(credential,game.players[s]?.hash))??null;}
 function authorize(game:SharedGame,credential:string){const seat=player(game,credential);if(!seat&&!matches(credential,game.spectatorHash))throw new Error('ACCESS_DENIED: enter a valid player code or spectator code.');return seat;}
 function view(game:SharedGame,seat:Seat|null){
  const position=describePosition(game.moves);const stats=gameStats(position.moves,game.timing,position.gameOver,Math.min(now(),game.expiresAt));stats.expiresAt=game.expiresAt;
  return {mode:'multiplayer' as const,gameId:game.gameId,version:game.version,expiresAt:game.expiresAt,createdAt:game.createdAt,position:{...position,gameId:game.gameId,timing:game.timing,stats},joined:!!game.players.White&&!!game.players.Black,role:seat?'player' as const:'spectator' as const,playerColor:seat,isOwner:seat===game.owner,coachingMode:seat?game.players[seat]!.coachingMode:'explanations' as CoachingMode,invitationOpen:seat===game.owner?game.invitationOpen:undefined};
 }
 async function mutate<T>(id:string,update:(g:SharedGame)=>{next:SharedGame;result:(saved:SharedGame)=>T}|{done:T}):Promise<T>{
  for(let attempt=0;attempt<5;attempt++){const game=await load(id);const action=update(game);if('done'in action)return action.done;action.next.version=game.version+1;if(await storage().compareAndSwap(id,game.version,action.next))return action.result(action.next);}
  throw new Error('REVISION_CONFLICT: game changed; refresh before retrying.');
 }
 return {
  async create(color:Seat='White',mode:CoachingMode='hints'){
   const gameId=randomUUID(),playerCode=code(),createdAt=now();
   const game:SharedGame={gameId,version:0,createdAt,expiresAt:createdAt+GAME_RETENTION_MS,owner:color,invitationOpen:true,players:{[color]:{hash:hash(playerCode),coachingMode:mode}},moves:[],timing:initialTiming(0,createdAt),receipts:[]};
   if(!await storage().create(gameId,game))throw new Error('CREATE_CONFLICT: retry starting the game.');
   return {...view(game,color),playerCode};
  },
  async join(gameId:string,mode:CoachingMode='hints'){
   const playerCode=code();
   return mutate(gameId,g=>{
    if(!g.invitationOpen||g.players.White&&g.players.Black)throw new Error('INVITATION_CLOSED: the other seat is taken or the invitation was revoked.');
    const seat:Seat=g.owner==='White'?'Black':'White';const timestamp=now();
    const next={...g,invitationOpen:false,players:{...g.players,[seat]:{hash:hash(playerCode),coachingMode:mode}},timing:initialTiming(0,timestamp)};
    // Game age/expiry begin at creation; thinking clocks start only when both players join.
    next.timing.createdAt=g.createdAt;
    return {next,result:saved=>({...view(saved,seat),playerCode})};
   });
  },
  async read(raw:GameAccess){const {gameId,code:credential}=accessSchema.parse(raw);const game=await load(gameId);return view(game,authorize(game,credential));},
  async play(raw:GameAccess,expectedRevision:number,requestId:string,move:string){
   const access=accessSchema.parse(raw);z.number().int().min(0).max(399).parse(expectedRevision);z.string().uuid().parse(requestId);z.string().min(2).max(12).parse(move);
   return mutate<ReturnType<typeof view>>(access.gameId,g=>{
    const seat=player(g,access.code);if(!seat)throw new Error('ACCESS_DENIED: only a player can move.');
    const receipt=g.receipts.find(r=>r.id===requestId);
    if(receipt){if(receipt.seat!==seat||receipt.revision!==expectedRevision||receipt.move!==move)throw new Error('REQUEST_CONFLICT: this requestId was used for different inputs.');return {done:view(g,seat)};}
    if(!g.players.White||!g.players.Black)throw new Error('WAITING_FOR_PLAYER: both players must join before moving.');
    if(g.moves.length!==expectedRevision)throw new Error('REVISION_CONFLICT: refresh before choosing a move.');
    const current=describePosition(g.moves);if(current.turn!==seat)throw new Error('NOT_YOUR_TURN: wait for the other player.');
    const nextPosition=playMove({moves:g.moves,move});const next={...g,moves:nextPosition.moves,timing:commitTiming(g.timing,g.moves.length,nextPosition.gameOver,now()),receipts:[...g.receipts,{id:requestId,seat,revision:expectedRevision,move}]};
    return {next,result:saved=>view(saved,seat)};
   });
  },
  async settings(raw:GameAccess,mode:CoachingMode){const a=accessSchema.parse(raw);coachingMode.parse(mode);return mutate(a.gameId,g=>{const seat=player(g,a.code);if(!seat)throw new Error('ACCESS_DENIED: only players have coaching preferences.');return {next:{...g,players:{...g.players,[seat]:{...g.players[seat]!,coachingMode:mode}}},result:saved=>view(saved,seat)};});},
  async sharing(raw:GameAccess,kind:'invitation'|'spectator',enabled:boolean){
   const a=accessSchema.parse(raw),spectatorCode=kind==='spectator'&&enabled?code():undefined;
   return mutate(a.gameId,g=>{const seat=player(g,a.code);if(seat!==g.owner)throw new Error('ACCESS_DENIED: only the creator manages sharing.');if(kind==='invitation'&&enabled&&g.players.White&&g.players.Black)throw new Error('INVITATION_CLOSED: both seats are already occupied.');
    const next=kind==='invitation'?{...g,invitationOpen:enabled}:{...g,spectatorHash:spectatorCode?hash(spectatorCode):undefined};
    return {next,result:saved=>({...view(saved,seat),...(spectatorCode?{spectatorCode}:{})})};
   });
  },
  async guidance(raw:GameAccess,expectedRevision:number,hintLevel:'question'|'concept'|'move'='concept',ply?:number){
   const a=accessSchema.parse(raw),g=await load(a.gameId),seat=authorize(g,a.code);
   if(g.moves.length!==expectedRevision)throw new Error('REVISION_CONFLICT: refresh before requesting coaching.');
   const position=describePosition(g.moves);if(ply!==undefined&&(!position.gameOver||ply<0||ply>g.moves.length||!Number.isInteger(ply)))throw new Error('REPLAY_UNAVAILABLE: review earlier positions only after the game finishes.');
   const moves=g.moves.slice(0,ply??g.moves.length),mode=seat?g.players[seat]!.coachingMode:'explanations';
   const options=mode==='suggestions'?{mode:'teach' as const}:mode==='hints'?{mode:'hint' as const,hintLevel:hintLevel==='move'?'concept' as const:hintLevel}:{mode:'hint' as const,hintLevel:'concept' as const};
   return {gameId:g.gameId,gameRevision:g.moves.length,ply:moves.length,coachingMode:mode,instruction:mode==='explanations'?'Explain the position and moves already played. Do not suggest a next move.':mode==='hints'?'Offer a question or conceptual hint. Do not reveal a move.':'Move suggestions are allowed. The player decides and submits their move; never play as their opponent.',...chessGuidance(moves,options)};
  },
 };
}
export type MultiplayerView=Awaited<ReturnType<MultiplayerService['read']>>;
export const sharedGames=multiplayerGames();
