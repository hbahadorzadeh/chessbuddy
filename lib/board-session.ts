import {describePosition, playMove, type Position} from './chess';

/** One mounted view owns its ephemeral position. Neither tool calls nor retries may fork it. */
export class BoardSession {
  position: Position;
  awaitingReply = false;
  private applying = false;
  get isApplying(){return this.applying;}
  constructor(moves: string[] = []) { this.position = describePosition(moves); }
  replace(position: Position) {
    const current=this.position;
    if(current.gameId && (position.gameId!==current.gameId || position.revision<current.revision || !current.moves.every((move,i)=>position.moves[i]===move)))return false;
    this.position=position; this.awaitingReply=false; return true;
  }
  async apply(move: string, expectedRevision: number, validate: (moves:string[],move:string)=>Promise<Position>, opponent=false) {
    if(this.applying) throw new Error('A move is already being applied.');
    if(expectedRevision!==this.position.revision) throw new Error('The board has moved on. Read the latest position before retrying.');
    if(opponent && !this.awaitingReply) throw new Error('The board is not waiting for a ChatGPT move.');
    if(!opponent && this.awaitingReply) throw new Error('Wait for ChatGPT to finish its move.');
    this.applying=true;
    try {
      const base=this.position;
      const next=await validate(base.moves,move);
      const expected=playMove({moves:base.moves,move});
      if((base.gameId && next.gameId!==base.gameId) || this.position!==base || next.fen!==expected.fen || JSON.stringify(next.moves)!==JSON.stringify(expected.moves)) throw new Error('The response does not match the current board.');
      this.position=next;
      this.awaitingReply=false;
      return next;
    }finally{this.applying=false;}
  }
}
