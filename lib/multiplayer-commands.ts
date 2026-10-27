import {z} from 'zod';
import {accessSchema,coachingMode,sharedGames,type MultiplayerService} from './multiplayer';
export const multiplayerCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),color:z.enum(['White','Black']).default('White'),coachingMode:coachingMode.default('hints')}),
 z.object({action:z.literal('join'),gameId:z.string().uuid(),coachingMode:coachingMode.default('hints')}),
 accessSchema.extend({action:z.literal('read')}),
 accessSchema.extend({action:z.literal('play'),expectedRevision:z.number().int().min(0).max(399),requestId:z.string().uuid(),move:z.string().min(2).max(12)}),
 accessSchema.extend({action:z.literal('settings'),coachingMode}),
 accessSchema.extend({action:z.literal('sharing'),kind:z.enum(['invitation','spectator']),enabled:z.boolean()}),
 accessSchema.extend({action:z.literal('guidance'),expectedRevision:z.number().int().min(0).max(400),hintLevel:z.enum(['question','concept','move']).default('concept'),ply:z.number().int().min(0).max(400).optional()}),
]);
export async function multiplayerCommandResult(raw:unknown,games:MultiplayerService=sharedGames){
 const a=multiplayerCommand.parse(raw);
 switch(a.action){
  case 'create':return games.create(a.color,a.coachingMode);
  case 'join':return games.join(a.gameId,a.coachingMode);
  case 'read':return games.read(a);
  case 'play':return games.play(a,a.expectedRevision,a.requestId,a.move);
  case 'settings':return games.settings(a,a.coachingMode);
  case 'sharing':return games.sharing(a,a.kind,a.enabled);
  case 'guidance':return games.guidance(a,a.expectedRevision,a.hintLevel,a.ply);
 }
}
export function multiplayerLinks<T extends {gameId:string;isOwner?:boolean;invitationOpen?:boolean;spectatorCode?:string}>(state:T,origin:string){
 const base=new URL('/multiplayer',origin);
 return {...state,...(state.isOwner&&state.invitationOpen?{invitationLink:`${base}?invite=${state.gameId}`} :{}),...(state.spectatorCode?{spectatorLink:`${base}?gameId=${state.gameId}#spectator=${state.spectatorCode}`}:{})};
}
