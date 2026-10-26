import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@modelcontextprotocol/ext-apps';
import {describePosition, type Position} from '../lib/chess';
import './style.css';

const glyphs: Record<string,string> = {wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const names: Record<string,string> = {k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const local = window.parent === window;
const bridge = local ? null : new App({name:'ChessBuddy board',version:'0.1.0'},{});
function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const s=value as Partial<Position>;
  return s.mode==='ephemeral-practice' && Array.isArray(s.moves) && typeof s.fen==='string' && Array.isArray(s.board) && Array.isArray(s.legalMoves);
}
function Board() {
  const [state,setState]=useState<Position|null>(local ? describePosition([]) : null);
  const [ready,setReady]=useState(local);
  const [selected,setSelected]=useState<string|null>(null);
  const [promotion,setPromotion]=useState('q');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if (!bridge) return;
    let mounted=true;
    bridge.ontoolresult=(result)=>{if(mounted && isPosition(result.structuredContent)){setState(result.structuredContent);setSelected(null);}};
    bridge.onhostcontextchanged=(context)=>{
      if (context.theme) document.documentElement.style.colorScheme=context.theme;
    };
    void bridge.connect().then(()=>{if(mounted)setReady(true);}).catch(()=>{if(mounted)setError('Could not connect to the ChatGPT host. Reopen the board to retry.');});
    return ()=>{mounted=false;};
  },[]);
  async function move(square:string) {
    if(!state || busy || !ready || state.gameOver) return;
    if(!selected){setSelected(square);return;}
    if(selected===square){setSelected(null);return;}
    const options=state.legalMoves.filter(m=>m.from===selected && m.to===square);
    if(!options.length){setSelected(square);return;}
    const candidate=options.find(m=>m.promotion===promotion) ?? options[0];
    setBusy(true);setError('');
    try {
      let next:unknown;
      if(bridge){
        const result=await bridge.callServerTool({name:'play_practice_move',arguments:{moves:state.moves,move:candidate.san}});
        if(result.isError) throw new Error('The server rejected that move. Reopen the latest position before retrying.');
        next=result.structuredContent;
      } else {
        const response=await fetch('/api/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moves:state.moves,move:candidate.san})});
        if(!response.ok)throw new Error('The server rejected that move.');
        next=await response.json();
      }
      if(!isPosition(next))throw new Error('The server returned an unexpected position.');
      setState(next);setSelected(null);
      if(bridge){
        try {await bridge.updateModelContext({structuredContent:{chessbuddy:next},content:[{type:'text',text:`Current ChessBuddy practice position: ${next.fen}. Complete SAN history: ${next.moves.join(' ')}. ${next.turn} to move. This is an ephemeral practice board with no engine analysis.`}]});}
        catch {setError('Move accepted, but ChatGPT context could not update. Reopen the position with this move history before asking about it.');}
      }
    } catch(e){setError(e instanceof Error?e.message:'Move failed. Try again.');}
    finally{setBusy(false);}
  }
  return <main><header><span className="logo">♞</span><div><p className="eyebrow">CHESSBUDDY</p><h1>Think one move ahead.</h1></div><span className="badge">Practice preview</span></header>
    <p className="intro">Select a piece, then its destination. Ask ChatGPT about the ideas behind the position.</p>
    <div role="status" aria-live="polite" className="status">{!state?'Waiting for your position…':busy?'Checking your move…':`${state.turn} to move · ${state.status}`}</div>
    {state && <div className="board" aria-label="Chessboard, White at bottom" aria-busy={busy}>{state.board.flatMap((rank,r)=>rank.map((piece,c)=>{
      const square=`${'abcdefgh'[c]}${8-r}`;
      const target=selected && state.legalMoves.some(m=>m.from===selected&&m.to===square);
      return <button key={square} disabled={!ready||busy||state.gameOver} aria-pressed={selected===square} aria-label={`${square}${piece?`, ${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:', empty'}${target?', legal destination':''}`} className={`square ${(r+c)%2?'dark':'light'} ${selected===square?'selected':''} ${target?'target':''} ${piece?.color==='w'?'white-piece':'black-piece'}`} onClick={()=>void move(square)}><span aria-hidden="true">{piece?glyphs[piece.color+piece.type]:''}</span><small aria-hidden="true">{square}</small></button>;
    }))}</div>}
    <div className="settings"><label>Promote to <select value={promotion} onChange={e=>setPromotion(e.target.value)}><option value="q">Queen</option><option value="r">Rook</option><option value="b">Bishop</option><option value="n">Knight</option></select></label><span>White at bottom</span></div>
    {error && <p role="alert" className="error">{error}</p>}
    <section><h2>Move history</h2><p className="history">{state?.moves.length?state.moves.map((m,i)=>`${i%2===0?`${Math.floor(i/2)+1}. `:''}${m}`).join(' '):'Your first move starts here.'}</p></section>
    <footer>This preview has no saved games or engine opponent. ChatGPT can discuss the position; engine-backed coaching comes next.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Board/>);
