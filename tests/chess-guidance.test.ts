import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {openingLines,lessons} from '../knowledge/chess';
import {chessGuidance} from '../lib/chess-guidance';
test('every curated opening and illustrative lesson variation is legal',()=>{
 for(const line of openingLines){const chess=new Chess();for(const move of line.moves.split(' '))assert.ok(chess.move(move,{strict:true}),`${line.id}: ${move}`);}
 for(const lesson of lessons){if('example' in lesson){const chess=new Chess(lesson.example.fen);for(const move of lesson.example.line)assert.ok(chess.move(move,{strict:true}),`${lesson.id}: ${move}`);}}
});
test('opening guidance matches exact positions, including transpositions; off-book gets no invented line',()=>{
 const advice=chessGuidance(['e4']);assert.ok(advice.openingCandidates?.some(m=>m.san==='e5'));
 const a=chessGuidance(['Nf3','d5','d4','Nf6']);const b=chessGuidance(['d4','d5','Nf3','Nf6']);assert.deepEqual(a.openingCandidates,b.openingCandidates);
 assert.deepEqual(chessGuidance(['a3']).openingCandidates,[]);
});
test('verified mate and a candidate allowing mate are detected without mutating the supplied history',()=>{
 const moves=['f3','e5'];const checked=chessGuidance(moves,{candidateMove:'g4'});
 assert.ok(checked.candidate?.opponentMateInOne?.includes('Qh4#'));assert.deepEqual(moves,['f3','e5']);
 assert.ok(chessGuidance([...moves,'g4']).verifiedMateInOne?.includes('Qh4#'));
 assert.equal(chessGuidance(moves,{candidateMove:'e5'}).candidate?.legal,false);
});
test('early hints do not reveal candidate moves or worked example variations',()=>{
 const hint=chessGuidance(['e4'],{mode:'hint',hintLevel:'question',topic:'fork'});
 assert.equal(hint.openingCandidates,undefined);assert.equal(hint.verifiedMateInOne,undefined);assert.equal(hint.candidate,undefined);
 assert.equal('example' in hint.lessons[0],false);assert.ok(hint.lessons[0].question);
 assert.deepEqual(chessGuidance(['f3','e5','g4','Qh4#']).openingCandidates,[]);
});
