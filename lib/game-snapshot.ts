import {z} from 'zod';
import {timingSchema} from './game-stats';
import {type Position} from './chess';

export const gameSnapshotSchema=z.object({gameId:z.string().uuid(),moves:z.array(z.string().min(2).max(12)).max(400),timing:timingSchema.optional(),expiresAt:z.number().int().nonnegative().nullable().optional()});
export type GameSnapshot=z.infer<typeof gameSnapshotSchema>;
export function gameSnapshot(position:Position):GameSnapshot {
 if(!position.gameId)throw new Error('This position has no game UUID.');
 return {gameId:position.gameId,moves:[...position.moves],timing:position.timing,expiresAt:position.stats.expiresAt};
}
