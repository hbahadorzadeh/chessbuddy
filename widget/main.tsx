import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@modelcontextprotocol/ext-apps';
import {describePosition, type Position} from '../lib/chess';
import './style.css';
import {BoardSession} from '../lib/board-session';

const glyphs: Record<string,string> = {wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const names: Record<string,string> = {k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const local = window.parent === window;
const bridge = local ? null : new App({name:'ChessBuddy board',version:'0.1.0'},{});
function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') return false;
  const s=value as Partial<Position>;
  return s.mode==='ephemeral-practice' && Array.isArray(s.moves) && typeof s.fen==='string' && Array.isArray(s.board) && Array.isArray(s.legalMoves);
}
type ModelContext = {
  registerTool: (tool:{name:string;description:string;inputSchema:Record<string,unknown>;execute:(args:{move:string;expectedRevision:number})=>Promise<string>})=>void;
  unregisterTool: (name:string)=>void;
};
function Board() {
  const [state,setState]=useState<Position|null>(local ? describePosition([]) : null);
  const session=useRef(new BoardSession());
  const hydrated=useRef(local);
  const [autoReply,setAutoReply]=useState(!local);
  const [waiting,setWaiting]=useState(false);
  const [ready,setReady]=useState(local);
  const [selected,setSelected]=useState<string|null>(null);
  const [promotion,setPromotion]=useState('q');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if (!bridge) return;
    let mounted=true;
    bridge.ontoolresult=(result)=>{if(mounted && !hydrated.current && isPosition(result.structuredContent)){hydrated.current=true;session.current.replace(result.structuredContent);setState(result.structuredContent);setWaiting(false);setSelected(null);}};
    bridge.onhostcontextchanged=(context)=>{
      if (context.theme) document.documentElement.style.colorScheme=context.theme;
    };
    const modelContext=(document as Document & {modelContext?:ModelContext}).modelContext;
    modelContext?.registerTool({
      name:'chessbuddy_play_on_board',
      description:'Play your opponent move on this already open ChessBuddy board. Use the revision in the latest board context. Updates this board in place; do not open a new board afterward.',
      inputSchema:{type:'object',properties:{move:{type:'string',description:'Legal SAN or UCI move'},expectedRevision:{type:'integer'}},required:['move','expectedRevision'],additionalProperties:false},
      execute:async(args)=>{
        try {
          const next=await session.current.apply(args.move,args.expectedRevision,validateMove,true);
          setState(next);setWaiting(false);setSelected(null);setError('');
          await publishPosition(next);
          return JSON.stringify({fen:next.fen,moves:next.moves,revision:next.revision,turn:next.turn,status:next.status});
        }catch(e){return JSON.stringify({error:e instanceof Error?e.message:'Move failed',revision:session.current.position.revision});}
      },
    });
    void bridge.connect().then(()=>{if(mounted)setReady(true);}).catch(()=>{if(mounted)setError('Could not connect to the ChatGPT host. Reopen the board to retry.');});
    return ()=>{mounted=false;modelContext?.unregisterTool('chessbuddy_play_on_board');};
  },[]);
  useEffect(()=>{
    if(!bridge || !waiting)return;
    let stopped=false;
    let timer:ReturnType<typeof setTimeout>;
    let failures=0;
    const deadline=Date.now()+120000;
    async function refresh(){
      const current=session.current.position;
      if(stopped || !current.boardKey)return;
      try{
        const result=await bridge!.callServerTool({name:'read_practice_board',arguments:{boardKey:current.boardKey}});
        if(stopped)return;
        if(result.isError){session.current.awaitingReply=false;setWaiting(false);setError('The live position is unavailable on this server instance. Your displayed history is intact. Try Check for reply, or Recover from history if it stays unavailable.');return;}
        const next=result.structuredContent;
        if(!isPosition(next))throw new Error('Unexpected live board');
        if(next.boardKey===current.boardKey && next.revision>current.revision && next.moves.slice(0,current.revision).join(' ')===current.moves.join(' ')){
          session.current.replace(next);setState(next);setWaiting(false);setSelected(null);setError('');await publishPosition(next);return;
        }
        failures=0;
      }catch{failures++;}
      if(!stopped){
        if(Date.now()>deadline || failures>=5){session.current.awaitingReply=false;setWaiting(false);setError('The reply has not arrived yet. Use “Check for reply” before requesting another move.');return;}
        timer=setTimeout(()=>void refresh(),2000);
      }
    }
    timer=setTimeout(()=>void refresh(),1500);
    return ()=>{stopped=true;clearTimeout(timer);};
  },[waiting]);
  async function checkReply(){
    if(!bridge || !session.current.position.boardKey)return;
    try{
      const result=await bridge.callServerTool({name:'read_practice_board',arguments:{boardKey:session.current.position.boardKey}});
      if(result.isError || !isPosition(result.structuredContent))throw new Error('Live board unavailable or expired.');
      const next=result.structuredContent;
      const current=session.current.position;
      if(next.boardKey!==current.boardKey || next.revision<current.revision || next.moves.slice(0,current.revision).join(' ')!==current.moves.join(' '))throw new Error('This server instance has an older or conflicting position. Your displayed history was preserved.');
      if(next.revision===current.revision){setError('No new reply is visible on this instance yet.');return;}
      session.current.replace(next);setState(next);setWaiting(false);setError('');await publishPosition(result.structuredContent);
    }catch(e){setError(e instanceof Error?e.message:'Could not refresh the board.');}
  }
  async function recoverBoard(){
    if(!bridge || busy || waiting)return;
    setBusy(true);
    try{
      const history=session.current.position.moves;
      const result=await bridge.callServerTool({name:'recover_practice_board',arguments:{moves:history}});
      if(result.isError || !isPosition(result.structuredContent) || result.structuredContent.moves.join(' ')!==history.join(' '))throw new Error('Recovery failed. Your move history is still on this board.');
      session.current.replace(result.structuredContent);setState(result.structuredContent);setWaiting(false);setSelected(null);setError('Recovered from displayed history. A reply to the previous board key may have been lost.');await publishPosition(result.structuredContent);
    }catch(e){setError(e instanceof Error?e.message:'Recovery failed.');}
    finally{setBusy(false);}
  }
  async function validateMove(moves:string[],move:string):Promise<Position> {
    let next:unknown;
    if(bridge){
      const result=await bridge.callServerTool({name:'play_practice_move',arguments:{moves,move,...(session.current.position.boardKey?{boardKey:session.current.position.boardKey,expectedRevision:session.current.position.revision}:{})}});
      if(result.isError)throw new Error('The server rejected that move. Try a legal move.');
      next=result.structuredContent;
    }else{
      const response=await fetch('/api/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moves,move})});
      if(!response.ok)throw new Error('The server rejected that move.');
      next=await response.json();
    }
    if(!isPosition(next))throw new Error('The server returned an unexpected position.');
    return next;
  }
  async function publishPosition(next:Position) {
    if(!bridge)return;
    try{await bridge.updateModelContext({structuredContent:{chessbuddy:next},content:[{type:'text',text:`Current open ChessBuddy board: ${next.fen}. Complete SAN history: ${next.moves.join(' ')}. Revision ${next.revision}. ${next.turn} to move. Board key: ${next.boardKey ?? "not available"}. ${next.boardKey?"Use play_practice_move with this boardKey and expectedRevision to update this board":"Use chessbuddy_play_on_board to update this board"}, never open_practice_board for an ordinary reply. No engine analysis is available.`}]});}
    catch{setError('Move accepted, but position context could not update. The turn request includes the complete position.');}
  }
  async function requestReply(position:Position) {
    if(!bridge || position.gameOver)return;
    session.current.awaitingReply=true;setWaiting(true);setError('');
    try{
      const modelContext=(document as Document & {modelContext?:ModelContext}).modelContext;
      if(position.boardKey){
        const result=await bridge.sendMessage({role:'user',content:[{type:'text',text:`I played ${position.moves.at(-1) ?? 'no move yet'}. It is your turn as ${position.turn} on the existing ChessBuddy board. Choose one legal move and call play_practice_move with boardKey "${position.boardKey}", expectedRevision ${position.revision}, moves ${JSON.stringify(position.moves)}, and your chosen move. The open board will update automatically. Do not call open_practice_board or draw another board. FEN: ${position.fen}. Legal SAN moves: ${position.legalMoves.map(m=>m.san).join(', ')}. Explain the idea briefly without claiming engine analysis.`}]});
        if(result.isError)throw new Error('ChatGPT could not accept the turn request.');
      }else if(modelContext){
        const result=await bridge.sendMessage({role:'user',content:[{type:'text',text:`I played ${position.moves.at(-1)} on the open ChessBuddy board. It is your turn as ${position.turn}. Choose one legal move and apply it using chessbuddy_play_on_board with expectedRevision ${position.revision}. Do not open or draw another board. FEN: ${position.fen}. Full SAN history: ${JSON.stringify(position.moves)}. Legal moves: ${position.legalMoves.map(m=>m.san).join(', ')}. Explain your idea briefly; do not claim engine analysis.`}]});
        if(result.isError)throw new Error('ChatGPT could not accept the turn request.');
      }else if(bridge.getHostCapabilities()?.sampling){
        const result=await bridge.createSamplingMessage({messages:[{role:'user',content:{type:'text',text:`Play ${position.turn} in this chess position: ${position.fen}. Choose exactly one of these legal SAN moves and return only the move: ${position.legalMoves.map(m=>m.san).join(', ')}.`}}],maxTokens:80});
        if(result.content.type!=='text')throw new Error('ChatGPT did not return a move.');
        const next=await session.current.apply(result.content.text.trim(),position.revision,validateMove,true);
        setState(next);setWaiting(false);await publishPosition(next);
      }else{
        throw new Error('This ChatGPT host cannot update an existing board automatically. Use ChatGPT Desktop with board tools, or turn off automatic replies for practice.');
      }
    }catch(e){session.current.awaitingReply=false;setWaiting(false);setError(e instanceof Error?e.message:'Could not request the next move.');}
  }
  async function move(square:string) {
    if(!state || busy || waiting || !ready || state.gameOver)return;
    if(!selected){setSelected(square);return;}
    if(selected===square){setSelected(null);return;}
    const options=state.legalMoves.filter(m=>m.from===selected && m.to===square);
    if(!options.length){setSelected(square);return;}
    const candidate=options.find(m=>m.promotion===promotion) ?? options[0];
    setBusy(true);setError('');
    try{
      const next=await session.current.apply(candidate.san,state.revision,validateMove);
      setState(next);setSelected(null);
      await publishPosition(next);
      if(autoReply)await requestReply(next);
    }catch(e){setError(e instanceof Error?e.message:'Move failed. Try again.');}
    finally{setBusy(false);}
  }
  return <main><header><span className="logo">♞</span><div><p className="eyebrow">CHESSBUDDY</p><h1>Think one move ahead.</h1></div><span className="badge">Practice preview</span></header>
    <p className="intro">Select a piece, then its destination. Ask ChatGPT about the ideas behind the position.</p>
    <div role="status" aria-live="polite" className="status">{!state?'Waiting for your position…':waiting?'ChatGPT is choosing a move…':busy?'Checking your move…':`${state.turn} to move · ${state.status}`}</div>
    {state && <div className="board" aria-label="Chessboard, White at bottom" aria-busy={busy}>{state.board.flatMap((rank,r)=>rank.map((piece,c)=>{
      const square=`${'abcdefgh'[c]}${8-r}`;
      const target=selected && state.legalMoves.some(m=>m.from===selected&&m.to===square);
      return <button key={square} disabled={!ready||busy||waiting||state.gameOver} aria-pressed={selected===square} aria-label={`${square}${piece?`, ${piece.color==='w'?'White':'Black'} ${names[piece.type]}`:', empty'}${target?', legal destination':''}`} className={`square ${(r+c)%2?'dark':'light'} ${selected===square?'selected':''} ${target?'target':''} ${piece?.color==='w'?'white-piece':'black-piece'}`} onClick={()=>void move(square)}><span aria-hidden="true">{piece?glyphs[piece.color+piece.type]:''}</span><small aria-hidden="true">{square}</small></button>;
    }))}</div>}
    <div className="settings"><label>Promote to <select value={promotion} onChange={e=>setPromotion(e.target.value)}><option value="q">Queen</option><option value="r">Rook</option><option value="b">Bishop</option><option value="n">Knight</option></select></label><span>White at bottom</span></div>
    {!local && <label className="auto-reply"><input type="checkbox" checked={autoReply} onChange={e=>{setAutoReply(e.target.checked);if(!e.target.checked){session.current.awaitingReply=false;setWaiting(false);}}}/> Ask ChatGPT to reply after my moves</label>}
    {!local && state && !state.gameOver && !waiting && !busy && <button onClick={()=>void requestReply(session.current.position)}>Ask ChatGPT to move</button>}
    {state?.boardKey && !busy && <button onClick={()=>void checkReply()}>Check for reply</button>}
    {state?.boardKey && !busy && !waiting && error && <button onClick={()=>void recoverBoard()}>Recover from history</button>}
    {waiting && <button onClick={()=>{session.current.awaitingReply=false;setWaiting(false);setError(session.current.position.boardKey?'Stopped waiting. A requested reply may still arrive; use Check for reply.':'Turn request cancelled on this board. Late replies will be rejected.');}}>Cancel waiting</button>}
    {error && <p role="alert" className="error">{error}</p>}
    <section><h2>Move history</h2><p className="history">{state?.moves.length?state.moves.map((m,i)=>`${i%2===0?`${Math.floor(i/2)+1}. `:''}${m}`).join(' '):'Your first move starts here.'}</p></section>
    <footer>Live boards use temporary app memory and may reset on Vercel. Your visible move history stays on this board. There are no accounts or engine opponent. ChatGPT can discuss the position; engine-backed coaching comes next.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Board/>);
