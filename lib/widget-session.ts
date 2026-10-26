import {describePosition,positionInput,type Position} from './chess';

/** Restore only a matching game's legal, non-regressing history. Never use a global last-game ID. */
export function restoreSession(incoming:Position,saved:unknown):Position {
  try{
    if(!saved || typeof saved!=='object' || !incoming.gameId)return incoming;
    const value=saved as {gameId?:unknown;moves?:unknown};
    if(value.gameId!==incoming.gameId || !Array.isArray(value.moves))return incoming;
    const {moves}=positionInput.parse({moves:value.moves});
    const restored={...describePosition(moves),gameId:incoming.gameId};
    if(restored.revision<incoming.revision || !incoming.moves.every((m,i)=>restored.moves[i]===m))return incoming;
    return restored;
  }catch{return incoming;}
}
export function sessionSnapshot(position:Position){return {gameId:position.gameId,moves:position.moves};}
