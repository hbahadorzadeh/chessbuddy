import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@modelcontextprotocol/ext-apps';
import {Chess} from 'chess.js';
import type {Replay} from '../lib/replay';
import {replayDelay} from '../lib/replay-playback';
import {formatDuration} from '../lib/game-stats';
import '../widget/style.css';
import './style.css';
const local=window.parent===window;
const bridge=local?null:new App({name:'ChessBuddy replay',version:'1.0.0'},{});
const pieces:Record<string,string>={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const pieceNames:Record<string,string>={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const isReplay=(value:unknown):value is Replay=>!!value && typeof value==='object' && (value as Replay).kind==='replay' && Array.isArray((value as Replay).frames);
type Host={widgetState?:{kind?:string;replayId?:string;cursor?:number;revision?:number};setWidgetState?:(state:unknown)=>void};
const host=()=>(window as Window&{openai?:Host}).openai;
async function callReplay(name:string,args:Record<string,unknown>){
  if(bridge){const result=await bridge.callServerTool({name,arguments:args});if(result.isError)throw new Error(result.content.filter(c=>c.type==='text').map(c=>c.text).join(' '));return result.structuredContent;}
  const result=await fetch('/api/replay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});const body=await result.json();if(!result.ok)throw new Error(body.error);return body;
 }
function ReplayApp(){
 const [replay,setReplay]=useState<Replay|null>(null);const current=useRef<Replay|null>(null);
 const [playing,setPlaying]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [recorded,setRecorded]=useState(false);const [speed,setSpeed]=useState(1);
 const [source,setSource]=useState('pgn');const [text,setText]=useState('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');const [fen,setFen]=useState('');const [start,setStart]=useState(0);
 const display=useCallback((next:Replay)=>{
  current.current=next;setReplay(next);
  try{host()?.setWidgetState?.({kind:'replay',replayId:next.replayId,cursor:next.cursor,revision:next.revision});}catch{/* Optional host state. */}
  if(bridge)void bridge.updateModelContext({structuredContent:{replayId:next.replayId,ply:next.cursor,revision:next.revision,fen:next.frames[next.cursor].fen,initialFen:next.initialFen},content:[{type:'text',text:`Viewing replay ${next.replayId}, ply ${next.cursor}/${next.moves.length}, FEN ${next.frames[next.cursor].fen}. Use get_replay_guidance(replayId, ply) to discuss this position or seek_replay to move this replay. Do not play a move in the active game.`}]}).catch(()=>{});
 },[]);
 useEffect(()=>{
  if(!bridge)return;let mounted=true;
  bridge.ontoolresult=result=>{
   if(!mounted||!isReplay(result.structuredContent))return;
   let next=result.structuredContent;const saved=host()?.widgetState;
   if(!current.current && saved?.kind==='replay' && saved.replayId===next.replayId && saved.revision===next.revision && Number.isInteger(saved.cursor) && saved.cursor!>=0 && saved.cursor!<next.frames.length)next={...next,cursor:saved.cursor!};
   if(current.current && (next.replayId!==current.current.replayId || next.revision<=current.current.revision))return;
   display(next);setPlaying(false);
  };
  void bridge.connect().catch(()=>setError('Could not connect to ChatGPT. Reopen this replay.'));
  return()=>{mounted=false;};
 },[display]);
 useEffect(()=>{
  if(!replay?.replayId)return;let stopped=false;let timer:ReturnType<typeof setTimeout>;
  async function refresh(){
   try{const old=current.current!;const next=await callReplay('read_replay',{replayId:old.replayId});if(!stopped&&isReplay(next)&&next.replayId===old.replayId&&next.revision>current.current!.revision){display(next);setPlaying(false);setError('');}}
   catch{/* The local replay remains usable if this instance loses its copy. */}
   if(!stopped)timer=setTimeout(()=>void refresh(),2500);
  }
  timer=setTimeout(()=>void refresh(),2500);return()=>{stopped=true;clearTimeout(timer);};
 },[replay?.replayId,display]);
 const seek=useCallback(async(ply:number)=>{
  setPlaying(false);const before=current.current;if(!before)return;setBusy(true);setError('');display({...before,cursor:ply});
  try{const next=await callReplay('seek_replay',{replayId:before.replayId,ply,expectedRevision:before.revision});if(!isReplay(next))throw new Error('Unexpected replay response.');display(next);}
  catch(e){setError(`${e instanceof Error?e.message:'Seek failed.'} The local replay is still available; remote synchronization is best-effort.`);}
  finally{setBusy(false);}
 },[display]);
 useEffect(()=>{
  const active=current.current;if(!playing||!active)return;
  const done=active.cursor>=active.moves.length;
  const timer=setTimeout(()=>{const value=current.current;if(!value)return;if(done)void seek(value.cursor);else display({...value,cursor:value.cursor+1});},done?0:replayDelay(active.frames[active.cursor+1].durationMs,recorded,speed));
  return()=>clearTimeout(timer);
 },[playing,replay?.cursor,recorded,speed,display,seek]);
 async function load(){setBusy(true);setError('');try{const next=await callReplay('create_replay',{...(source==='pgn'?{pgn:text}:{moves:text.trim()?text.trim().split(/\s+/):[]}),...(fen?{initialFen:fen}:{}),startPly:start});if(!isReplay(next))throw new Error('Unexpected replay response.');display(next);setPlaying(false);}catch(e){setError(e instanceof Error?e.message:'Import failed.');}finally{setBusy(false);}}
 async function discuss(){const value=current.current;if(!bridge||!value)return;await seek(value.cursor);const latest=current.current!;try{const result=await bridge.sendMessage({role:'user',content:[{type:'text',text:`Explain the strategies and threats at ply ${latest.cursor} of replay ${latest.replayId}. Call get_replay_guidance for this exact ply. FEN: ${latest.frames[latest.cursor].fen}. Initial FEN: ${latest.initialFen}. This is a replay; do not change or replace my active game. Distinguish the supplied game metadata from verified historical facts.`}]});if(result.isError)throw new Error('ChatGPT rejected the review request.');}catch(e){setError(e instanceof Error?e.message:'Review request failed.');}}
 const frame=replay?.frames[replay.cursor];
 const totals=(player:'White'|'Black')=>{const moves=replay?.frames.slice(1,replay.cursor+1).filter(f=>f.player===player)??[];const known=moves.filter(f=>f.durationMs!==null);return {count:moves.length,time:known.length?known.reduce((n,f)=>n+f.durationMs!,0):null,complete:known.length===moves.length};};
 const white=totals('White'),black=totals('Black');
 const board=frame?new Chess(frame.fen).board():null;
 return <main><header><span className="logo">♞</span><div><p className="eyebrow">CHESSBUDDY · REPLAY</p><h1>{replay?.title??'Every move has a story.'}</h1></div></header>
  {local&&<details open={!replay}><summary>Import a replay</summary><label>Source <select value={source} onChange={e=>setSource(e.target.value)}><option value="pgn">PGN</option><option value="moves">SAN/UCI move list</option></select></label><textarea aria-label="PGN or move list" value={text} onChange={e=>setText(e.target.value)}/><label>Starting FEN (optional)<input value={fen} onChange={e=>setFen(e.target.value)} placeholder="Use a FEN to start mid-game"/></label><label>Start at relative ply<input type="number" min="0" value={start} onChange={e=>setStart(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void load()}>Open replay</button></details>}
  {!replay&&<p role="status">{local?'Import PGN or moves above.':'Waiting for replay data…'}</p>}
  {replay&&frame&&<><p className="intro">Replay only · your active game is unchanged.</p><div className="status" role="status">{frame.san?`${frame.moveNumber}${frame.player==='Black'?'…':'.'} ${frame.san}`:'Supplied initial position'} · ply {replay.cursor}/{replay.moves.length} · {new Chess(frame.fen).turn()==='w'?'White':'Black'} to move</div>
   <div className="clocks"><div><span>Recorded White</span><strong>{formatDuration(white.time)}</strong><small>{white.count} moves in replay{!white.complete?' · partial timing':''}</small></div><div><span>Recorded Black</span><strong>{formatDuration(black.time)}</strong><small>{black.count} moves in replay{!black.complete?' · partial timing':''}</small></div><div><span>Viewing position</span><strong>{replay.cursor}/{replay.moves.length}</strong><small>relative half-moves</small></div></div>
   <div className="board" aria-label="Replay chessboard, White at bottom">{board!.flatMap((rank,r)=>rank.map((piece,c)=>{const square=`${'abcdefgh'[c]}${8-r}`;return <div key={square} role="img" aria-label={`${square}${piece?`, ${piece.color==='w'?'White':'Black'} ${pieceNames[piece.type]}`:', empty'}`} className={`square ${(r+c)%2?'dark':'light'} ${piece?.color==='w'?'white-piece':'black-piece'}`}><span aria-hidden="true">{piece?pieces[piece.color+piece.type]:''}</span><small aria-hidden="true">{square}</small></div>;}))}</div>
   <div className="replay-controls"><button disabled={busy||replay.cursor===0} onClick={()=>void seek(0)}>First</button><button disabled={busy||replay.cursor===0} onClick={()=>void seek(replay.cursor-1)}>Previous</button><button disabled={busy||replay.moves.length===0} onClick={()=>playing?void seek(replay.cursor):setPlaying(true)}>{playing?'Pause':'Play'}</button><button disabled={busy||replay.cursor===replay.moves.length} onClick={()=>void seek(replay.cursor+1)}>Next</button><button disabled={busy||replay.cursor===replay.moves.length} onClick={()=>void seek(replay.moves.length)}>Last</button></div>
   <label className="replay-jump">Position <input type="range" min="0" max={replay.moves.length} value={replay.cursor} disabled={busy} onChange={e=>void seek(Number(e.target.value))}/></label>
   <div className="settings"><label><input type="checkbox" checked={recorded} onChange={e=>setRecorded(e.target.checked)}/> Use recorded move times</label><label>Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[1,2,4,8,16].map(s=><option key={s} value={s}>{s}×</option>)}</select></label></div>
   <p className="clock-note">Last move time: {formatDuration(frame.durationMs)}. Missing timings use a 1.5-second study pace. Recorded times are elapsed per move, not PGN clock balances.</p>
   {bridge&&<button disabled={busy} onClick={()=>void discuss()}>Ask ChatGPT about this position</button>}
   <details><summary>Position and source</summary><code className="replay-fen">{frame.fen}</code><p className="clock-note">{replay.source}</p><p className="game-id">Replay: {replay.replayId}</p></details>
   <section><h2>Recorded moves</h2><div className="replay-moves">{replay.frames.slice(1).map(f=><button key={f.ply} aria-current={f.ply===replay.cursor?'step':undefined} disabled={busy} onClick={()=>void seek(f.ply)}>{f.moveNumber}{f.player==='Black'?'…':'.'} {f.san}</button>)}</div></section>
  </>}
  {error&&<p role="alert" className="error">{error}</p>}
  <footer>Replay starts at the supplied FEN and viewing ply. App-memory synchronization is best-effort on Vercel. Historical annotations and strategic advice are not engine evaluations.</footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<ReplayApp/>);
