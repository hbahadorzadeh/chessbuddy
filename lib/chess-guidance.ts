import {Chess} from 'chess.js';
import {openingLines,lessons,playingInstructions} from '../knowledge/chess';

const key=(chess:Chess)=>chess.fen().split(' ').slice(0,4).join(' ');
const book=new Map<string, {san:string;opening:string;idea:string}[]>();
for(const line of openingLines){
 const chess=new Chess();
 for(const san of line.moves.split(' ')){
  const before=key(chess);const idea=chess.turn()==='w'?line.white:line.black;
  const moved=chess.move(san,{strict:true});
  const entries=book.get(before)??[];
  entries.push({san:moved.san,opening:line.name,idea});book.set(before,entries);
 }
}
export type GuidanceOptions={mode?:'play'|'hint'|'teach';hintLevel?:'question'|'concept'|'move';topic?:string;candidateMove?:string;initialFen?:string};
function mateInOne(chess:Chess){
 const mates:string[]=[];
 for(const move of chess.moves()){
  chess.move(move,{strict:true});if(chess.isCheckmate())mates.push(move);chess.undo();
 }
 return mates;
}
export function chessGuidance(moves:string[],options:GuidanceOptions={}){
 const chess=new Chess(options.initialFen);for(const move of moves)chess.move(move,{strict:true});
 const fen=chess.fen();const revision=moves.length;
 const terminal=chess.isGameOver();
 const noMoves=options.mode==='hint' && options.hintLevel!=='move';
 const nonPawnPieces=chess.board().flat().filter(p=>p && p.type!=='k' && p.type!=='p').length;
 const opening=Number(chess.fen().split(' ')[5])<10 && nonPawnPieces>=10;
 const topics=options.topic?[options.topic]:chess.isCheck()?['safety','king-safety','material']:opening?['safety','development','centre','king-safety']:nonPawnPieces<=6?['safety','material','endgame']:['safety','material','king-safety'];
 const relevant=lessons.filter(lesson=>topics.includes(lesson.id));
 if(options.topic && relevant.length===0)throw new Error('Unknown lesson topic.');
 const teaching=relevant.map(lesson=>noMoves?{id:lesson.id,title:lesson.title,question:lesson.question,...(options.hintLevel==='concept'?{explanation:lesson.explanation}:{})}:lesson);
 const recommendations: {san:string;openings:string[];idea:string}[]=[];
 if(!terminal && !noMoves){
  for(const entry of book.get(key(chess))??[]){
   if(!chess.moves().includes(entry.san))continue;
   const existing=recommendations.find(m=>m.san===entry.san);
   if(existing){if(!existing.openings.includes(entry.opening))existing.openings.push(entry.opening);}
   else recommendations.push({san:entry.san,openings:[entry.opening],idea:entry.idea});
  }
 }
 let candidate: {legal:boolean;san?:string;opponentMateInOne?:string[];warning?:string}|undefined;
 if(options.candidateMove && !noMoves && !terminal){
  const uci=/^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(options.candidateMove);
  let played;
  try{played=chess.move(uci?{from:uci[1],to:uci[2],promotion:uci[3]}:options.candidateMove,{strict:true});}
  catch{candidate={legal:false,warning:'Illegal candidate; do not play it.'};}
  if(played){
   const matingReplies=chess.isGameOver()?[]:mateInOne(chess);
   candidate={legal:true,san:played.san,opponentMateInOne:matingReplies,warning:matingReplies.length?'This move allows an immediate mating reply.':'No immediate mating reply found; this does not prove the move is safe or best.'};chess.undo();
  }
 }
 return {
  knowledgeVersion:'1.0',revision,fen,sideToMove:chess.turn()==='w'?'White':'Black',inCheck:chess.isCheck(),gameOver:terminal,
  source:'Curated standard opening lines and original teaching notes; legal moves validated with chess.js.',
  limitations:'No engine evaluation. Book coverage is limited; legal moves and one-move checks do not establish professional playing strength.',
  ...(noMoves?{}:{openingCandidates:recommendations.slice(0,5),verifiedMateInOne:terminal?[]:mateInOne(chess),candidate}),
  lessons:teaching,
  ...(options.mode==='play'?{playingInstructions}:{}),
 };
}
export const knowledgeCatalogue={version:'1.0',openingLines,lessons,playingInstructions,limitations:'Illustrative example positions are not recommendations for another position. No engine scores or guarantee of best play.'};
