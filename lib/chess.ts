import {gameStats,type GameTiming} from './game-stats';
import { Chess } from 'chess.js';
import { z } from 'zod';

export const positionInput = z.object({
  moves: z.array(z.string().min(2).max(12)).max(400).default([]),
});
export const moveInput = positionInput.extend({move: z.string().min(2).max(12)});
export type Position = ReturnType<typeof describePosition>;

export function describePosition(moves: string[]) {
  const chess = new Chess();
  for (const move of moves) chess.move(move, {strict: true});
  return {
    mode: 'ephemeral-practice' as const,
    gameId: undefined as string | undefined,
    timing: undefined as GameTiming | undefined,
    stats: gameStats(chess.history(),undefined,chess.isGameOver()),
    moves: chess.history(),
    revision: chess.history().length,
    fen: chess.fen(),
    turn: chess.turn() === 'w' ? 'White' : 'Black',
    status: chess.isCheckmate() ? 'checkmate' : chess.isStalemate() ? 'stalemate' : chess.isDraw() ? 'draw' : chess.isCheck() ? 'check' : 'active',
    gameOver: chess.isGameOver(),
    legalMoves: chess.moves({verbose:true}).map(m => ({from:m.from,to:m.to,promotion:m.promotion,san:m.san})),
    board: chess.board(),
  };
}
export function playMove(raw: unknown) {
  const {moves,move} = moveInput.parse(raw);
  const current = describePosition(moves);
  if (current.gameOver) throw new Error('This position is finished. Open a new practice board.');
  const chess = new Chess();
  for (const previous of current.moves) chess.move(previous, {strict:true});
  const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(move);
  if (uci) chess.move({from:uci[1],to:uci[2],promotion:uci[3]});
  else chess.move(move, {strict:true});
  return describePosition(chess.history());
}
