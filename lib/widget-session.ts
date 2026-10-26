import {restoreTiming,GAME_RETENTION_MS,gameStats} from './game-stats';
import {describePosition,positionInput,type Position} from './chess';

/** Restore only a matching game's legal, non-regressing history. Never use a global last-game ID. */
export function restoreSession(incoming:Position,saved:unknown):Position {
  try{
    if(!saved || typeof saved!=='object' || !incoming.gameId)return incoming;
    const value=saved as {gameId?:unknown;moves?:unknown;timing?:unknown;expiresAt?:unknown};
    if(value.gameId!==incoming.gameId || !Array.isArray(value.moves))return incoming;
    if(typeof value.expiresAt==='number' && value.expiresAt<=Date.now())return incoming;
    const {moves}=positionInput.parse({moves:value.moves});
    const position=describePosition(moves);
    const timing=restoreTiming(value.timing,moves.length);
    if(timing && timing.updatedAt+GAME_RETENTION_MS<=Date.now())return incoming;
    const restored={...position,gameId:incoming.gameId,timing,stats:gameStats(moves,timing,position.gameOver)};
    if(restored.revision<incoming.revision || !incoming.moves.every((m,i)=>restored.moves[i]===m))return incoming;
    return restored.revision===incoming.revision?incoming:restored;
  }catch{return incoming;}
}
export function sessionSnapshot(position:Position){return {gameId:position.gameId,moves:position.moves,timing:position.timing,expiresAt:position.stats.expiresAt};}
