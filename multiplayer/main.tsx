import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@modelcontextprotocol/ext-apps';
import {describePosition} from '../lib/chess';
import {gameStats,formatDuration} from '../lib/game-stats';
import type {MultiplayerView,CoachingMode} from '../lib/multiplayer';
import '../widget/style.css';
import './style.css';
const local=window.parent===window;
const bridge=local?null:new App({name:'ChessBuddy multiplayer',version:'0.6.0'},{});
type View=MultiplayerView&{playerCode?:string;spectatorCode?:string;invitationLink?:string;spectatorLink?:string};
type Access={gameId:string;code:string};
type Saved=Access&{expiresAt:number};
type Host={widgetState?:Saved;setWidgetState?:(s:Saved|null)=>void};
const host=()=> (window as Window&{openai?:Host}).openai;
const glyphs:Record<string,string>={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const tools:Record<string,string>={create:'create_multiplayer_game',join:'join_multiplayer_game',read:'read_multiplayer_game',play:'play_multiplayer_move',settings:'set_multiplayer_coaching',sharing:'manage_multiplayer_sharing',guidance:'get_multiplayer_guidance'};
function isView(v:unknown):v is View{return !!v&&typeof v==='object'&&(v as View).mode==='multiplayer'&&typeof(v as View).gameId==='string'&&!!(v as View).position;}
function savedAccess(id:string):Saved|null{
 try{const saved=host()?.widgetState?.gameId===id?host()!.widgetState:JSON.parse(localStorage.getItem(`chessbuddy:player:${id}`)??'null');if(saved?.gameId===id&&saved.expiresAt>Date.now())return saved;localStorage.removeItem(`chessbuddy:player:${id}`);}catch{/* Sandboxed storage may be unavailable. */}return null;
}
function Multiplayer(){
 const [state,setState]=useState<View|null>(null),[access,setAccess]=useState<Access|null>(null);
 const stateRef=useRef<View|null>(null),accessRef=useRef<Access|null>(null),busyRef=useRef(false);
 const [ready,setReady]=useState(local),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [gameId,setGameId]=useState(''),[credential,setCredential]=useState(''),[mode,setMode]=useState<CoachingMode>('hints'),[color,setColor]=useState('White');
 const [selected,setSelected]=useState<string|null>(null),[promotion,setPromotion]=useState('q'),[tick,setTick]=useState(()=>Date.now()),[ply,setPly]=useState<number|null>(null),[guidance,setGuidance]=useState('');
 const [invite,setInvite]=useState(''),[spectator,setSpectator]=useState('');
 const pending=useRef<{action:string;gameId:string;code:string;expectedRevision:number;requestId:string;move:string}|null>(null);
 const [retry,setRetry]=useState(false);
 const expired=!!state&&tick>=state.expiresAt;
 async function call(action:string,args:Record<string,unknown>={}){
  if(bridge){const r=await bridge.callServerTool({name:tools[action],arguments:args});if(r.isError)throw new Error(r.content?.filter(c=>c.type==='text').map(c=>c.text).join(' ')||'Game request failed.');return r.structuredContent;}
  const r=await fetch('/api/multiplayer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...args})});const data=await r.json();if(!r.ok)throw new Error(data.error??'Game request failed.');return data;
 }
 async function accept(next:View,provided?:Access){
  const current=stateRef.current;
  if(current?.gameId===next.gameId&&next.version<current.version)return;
  if(current&&current.gameId!==next.gameId){setSpectator('');setPly(null);pending.current=null;setRetry(false);}
  const previous=accessRef.current?.gameId===next.gameId?accessRef.current:null;
  const a=provided??(next.playerCode?{gameId:next.gameId,code:next.playerCode}:previous??savedAccess(next.gameId));
  stateRef.current=next;accessRef.current=a;setState(next);setAccess(a);setGameId(next.gameId);setSelected(null);setMode(next.coachingMode);setError('');
  if(next.invitationLink)setInvite(next.invitationLink);
  else if(next.isOwner&&next.invitationOpen)setInvite(`${local?location.origin:'https://chessbuddy-self.vercel.app'}/multiplayer?invite=${next.gameId}`);
  else setInvite('');
  if(next.spectatorLink)setSpectator(next.spectatorLink);
  if(a){const saved={...a,expiresAt:next.expiresAt};try{localStorage.setItem(`chessbuddy:player:${next.gameId}`,JSON.stringify(saved));}catch{/* Private code remains available on screen. */}try{host()?.setWidgetState?.(saved);}catch{/* Host state is optional. */}}

 }
 async function operation(action:string,args:Record<string,unknown>,provided?:Access){
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
  try{const next=await call(action,args);if(!isView(next))throw new Error('Unexpected game response.');await accept(next,provided);if(action==='play'){pending.current=null;setRetry(false);}if(action==='sharing'&&args.kind==='spectator'&&!args.enabled)setSpectator('');}
  catch(e){setError(e instanceof Error?e.message:'Game request failed.');if(action==='play')setRetry(true);}
  finally{busyRef.current=false;setBusy(false);}
 }
 useEffect(()=>{
  if(!bridge){queueMicrotask(()=>{const params=new URLSearchParams(location.search),id=params.get('invite')??params.get('gameId')??'';setGameId(id);const spectatorCode=new URLSearchParams(location.hash.slice(1)).get('spectator');
   // No secret remains in the address bar after capturing a spectator link. Player codes are never accepted in URLs.
   if(location.hash)history.replaceState(null,'',location.pathname+location.search);
   const a=spectatorCode?{gameId:id,code:spectatorCode}:savedAccess(id);
   if(a&&id){setCredential(a.code);void operation('read',a,a);}});return;
  }
  let mounted=true;
  bridge.ontoolresult=r=>{if(mounted&&isView(r.structuredContent))void accept(r.structuredContent, r._meta?.gameAccess as Access|undefined);};
  bridge.onhostcontextchanged=c=>{if(c.theme)document.documentElement.style.colorScheme=c.theme;};
  void bridge.connect().then(()=>{if(mounted)setReady(true);}).catch(()=>setError('Could not connect to ChatGPT. Reopen the board.'));
  return ()=>{mounted=false;};
 // Bridge lifecycle runs once. Mutable refs hold the current session.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const timer=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  const next=stateRef.current,a=accessRef.current;
  if(!bridge||!ready||!next)return;
  const viewed=ply===null?next.position:describePosition(next.position.moves.slice(0,ply));
  void bridge.updateModelContext({structuredContent:{multiplayer:next,access:a,viewedPly:ply??next.position.revision,viewedPosition:viewed},content:[{type:'text',text:`Two-human ChessBuddy game ${next.gameId}, live revision ${next.position.revision}. Viewing ${ply===null?'live/final position':`completed-game ply ${ply}`}, FEN ${viewed.fen}. My role: ${next.playerColor??'spectator'}. Coaching mode: ${next.coachingMode}. ChatGPT is a coach, never the other human. Call get_multiplayer_guidance with expectedRevision ${next.position.revision}${ply!==null?` and ply ${ply}`:''} before advising; never use practice tools. ${a?`Private access for THIS conversation only: ${JSON.stringify(a)}. Never put this code in a link or share with spectators.`:'Ask me to enter my access code.'}`} ]}).catch(()=>setError('The board is ready, but ChatGPT context could not update. Use Ask ChatGPT to explain to share the exact position.'));
 },[ply,state?.version,access?.code,ready]);

 useEffect(()=>{
  if(!access||!ready||expired)return;let stopped=false;let timer:ReturnType<typeof setTimeout>;
  async function poll(){if(stopped)return;if(!busyRef.current&&document.visibilityState!=='hidden')try{const next=await call('read',access!);if(!stopped&&!busyRef.current&&isView(next)&&accessRef.current?.gameId===access!.gameId&&accessRef.current?.code===access!.code&&next.version>=(stateRef.current?.version??0)){if(next.version!==(stateRef.current?.version??-1)||next.role!==stateRef.current?.role||next.playerColor!==stateRef.current?.playerColor)await accept(next);}}catch(e){if(!stopped)setError(e instanceof Error?e.message:'Refresh failed.');}if(!stopped)timer=setTimeout(()=>void poll(),3000);}
  timer=setTimeout(()=>void poll(),1500);return()=>{stopped=true;clearTimeout(timer);};
 // The interval reads state via refs; do not restart it after every clock tick.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[access?.gameId,access?.code,ready,expired]);
 useEffect(()=>{if(expired&&access){try{localStorage.removeItem(`chessbuddy:player:${access.gameId}`);host()?.setWidgetState?.(null);}catch{/* Storage is optional. */}}},[expired,access]);
 const actual=state?.position;
 const shown=actual&&ply!==null?describePosition(actual.moves.slice(0,ply)):actual;
 const stats=actual?gameStats(actual.moves,actual.timing,actual.gameOver||!state?.joined,Math.min(tick,state!.expiresAt)):null;
 const canMove=!!state&&state.role==='player'&&state.joined&&actual?.turn===state.playerColor&&!actual.gameOver&&!expired&&ply===null&&!!access&&!busy;
 async function square(s:string){if(!canMove||!actual||!access)return;if(!selected){setSelected(s);return;}const options=actual.legalMoves.filter(m=>m.from===selected&&m.to===s);if(!options.length){setSelected(s===selected?null:s);return;}const move=(options.find(m=>m.promotion===promotion)??options[0]).san;
  const request=pending.current?.gameId===access.gameId&&pending.current.expectedRevision===actual.revision&&pending.current.move===move?pending.current:{action:'play',...access,expectedRevision:actual.revision,requestId:crypto.randomUUID(),move};pending.current=request;await operation('play',request);
 }
 async function coach(){if(!state||!access)return;setGuidance('');setError('');try{
  const args={...access,expectedRevision:state.position.revision,...(ply!==null?{ply}:{})};
  if(bridge){const r=await bridge.sendMessage({role:'user',content:[{type:'text',text:`Please explain this two-human ChessBuddy game in my private conversation. First call get_multiplayer_guidance with ${JSON.stringify(args)}. Respect my ${state.coachingMode} coaching mode. Never play the other human's turn or share my access code. ${ply!==null?`Review completed-game ply ${ply}.`:''}`} ]});if(r.isError)throw new Error('ChatGPT could not accept the coaching request.');}
  else{const g=await call('guidance',args) as {instruction:string;lessons:{title:string;explanation?:string;question?:string}[]};setGuidance([g.instruction,...g.lessons.map(l=>`${l.title}: ${l.explanation??l.question??''}`)].join('\n\n'));}
 }catch(e){setError(e instanceof Error?e.message:'Coaching unavailable.');}}
 return <main><header><span className="logo">♞</span><div><p className="eyebrow">CHESSBUDDY</p><h1>Play together. Learn together.</h1></div><span className="badge">Multiplayer · v0.6</span></header>
 <p className="intro">Two people, one game. ChatGPT coaches each player in their own conversation.</p>
 {!state&&<section className="lobby"><h2>Create or join</h2><label>Your color <select value={color} onChange={e=>setColor(e.target.value)}><option>White</option><option>Black</option></select></label><label>Your coaching <select value={mode} onChange={e=>setMode(e.target.value as CoachingMode)}><option value="explanations">Explanations only</option><option value="hints">Hints</option><option value="suggestions">Move suggestions</option></select></label><button disabled={!ready||busy} onClick={()=>void operation('create',{color,coachingMode:mode})}>Create game</button>
 <label>Invitation / game UUID<input value={gameId} onChange={e=>{const raw=e.target.value;try{const u=new URL(raw);setGameId(u.searchParams.get('invite')??u.searchParams.get('gameId')??raw);const c=new URLSearchParams(u.hash.slice(1)).get('spectator');if(c)setCredential(c);}catch{setGameId(raw);}}}/></label><button disabled={!ready||busy||!gameId} onClick={()=>void operation('join',{gameId,coachingMode:mode})}>Accept invitation</button>
 <label>Player or spectator code (to resume)<input type="password" autoComplete="off" value={credential} onChange={e=>setCredential(e.target.value)}/></label><button disabled={!ready||busy||!credential||!gameId} onClick={()=>void operation('read',{gameId,code:credential},{gameId,code:credential})}>Open existing game</button><p className="clock-note">Invitations work here or in ChatGPT: ask ChessBuddy to join the game UUID. To resume there, provide your UUID and private player code. Never share your player code with the other player.</p></section>}
 {state&&actual&&shown&&<><div className="status" role="status">{expired?'Seven-day retention ended':!state.joined?'Waiting for the other player':ply!==null?`Review ply ${ply}/${actual.revision} · ${shown.turn} to move · ${shown.status}`:actual.gameOver?`Game finished · ${actual.status}`:`${actual.turn} to move · ${actual.status}`} · {state.playerColor?`You play ${state.playerColor}`:'Spectator · read only'}</div>
 {stats&&<div className="clocks"><div><span>White · {stats.white.moves} moves</span><strong>{formatDuration(stats.white.thinkingMs)}</strong></div><div><span>Black · {stats.black.moves} moves</span><strong>{formatDuration(stats.black.thinkingMs)}</strong></div><div><span>Half-moves</span><strong>{actual.revision}</strong></div></div>}
 <div className="board" aria-label="Chessboard, White at bottom" aria-busy={busy}>{shown.board.flatMap((rank,r)=>rank.map((p,c)=>{const s=`${'abcdefgh'[c]}${8-r}`;const target=selected&&shown.legalMoves.some(m=>m.from===selected&&m.to===s);return <button key={s} disabled={!canMove} className={`square ${(r+c)%2?'dark':'light'} ${selected===s?'selected':''} ${target?'target':''} ${p?.color==='w'?'white-piece':'black-piece'}`} aria-pressed={selected===s} aria-label={`${s}${p?`, ${p.color==='w'?'White':'Black'} ${p.type}`:', empty'}`} onClick={()=>void square(s)}><span aria-hidden="true">{p?glyphs[p.color+p.type]:''}</span><small aria-hidden="true">{s}</small></button>;}))}</div>
 <p className="game-id">Game <code>{state.gameId}</code> · revision {actual.revision}<br/>Expires {new Date(state.expiresAt).toLocaleString()} · seven days after creation</p>
 <div className="settings"><label>Promote to<select value={promotion} onChange={e=>setPromotion(e.target.value)}><option value="q">Queen</option><option value="r">Rook</option><option value="b">Bishop</option><option value="n">Knight</option></select></label><button disabled={!access||busy||expired} onClick={()=>access&&void operation('read',access,access)}>Refresh</button></div>
 {access&&<section><h2>Your private access</h2><details><summary>Show {state.role==='player'?'player':'spectator'} code</summary><p>Keep this code to reopen the game in the app or your own ChatGPT. Anyone holding a player code can play that seat.</p><input readOnly value={access.code} aria-label="Private access code" onFocus={e=>e.target.select()}/></details></section>}
 {state.role==='player'&&access&&<section><label>Your coaching<select disabled={busy||expired} value={state.coachingMode} onChange={e=>void operation('settings',{...access,coachingMode:e.target.value})}><option value="explanations">Explanations only</option><option value="hints">Hints</option><option value="suggestions">Move suggestions</option></select></label></section>}
 {state.isOwner&&access&&!expired&&<section><h2>Share this game</h2>{invite&&<label>Invitation link (no player code)<input readOnly value={invite} onFocus={e=>e.target.select()}/></label>}{!state.joined&&<button disabled={busy} onClick={()=>void operation('sharing',{...access,kind:'invitation',enabled:!state.invitationOpen})}>{state.invitationOpen?'Revoke invitation':'Enable invitation'}</button>}<button disabled={busy} onClick={()=>void operation('sharing',{...access,kind:'spectator',enabled:true})}>Create / replace spectator link</button><button disabled={busy} onClick={()=>void operation('sharing',{...access,kind:'spectator',enabled:false})}>Revoke spectator access</button>{spectator&&<label>Read-only spectator link<input readOnly value={spectator} onFocus={e=>e.target.select()}/></label>}<p className="clock-note">First person to accept claims the other seat. If the wrong person joins, create a new game. Replacing a spectator link invalidates the previous one.</p></section>}
 {actual.gameOver&&<section><h2>Review completed game</h2><label>Position {ply??actual.revision} / {actual.revision}<input type="range" min="0" max={actual.revision} value={ply??actual.revision} onChange={e=>setPly(Number(e.target.value))}/></label><button onClick={()=>setPly(null)}>Final position</button><p className="clock-note">Reviewing changes only your view. The shared game remains unchanged.</p></section>}
 <section><h2>Moves</h2><div className="move-tracker"><table><thead><tr><th>Move</th><th>Player</th><th>SAN</th><th>Time</th></tr></thead><tbody>{stats?.moveLog.map(m=><tr key={m.ply}><td>{m.moveNumber}{m.player==='Black'?'…':'.'}</td><td>{m.player}</td><td>{m.san}</td><td>{formatDuration(m.thinkingMs)}</td></tr>)}</tbody></table></div></section>
 <button disabled={!access||busy||expired} onClick={()=>void coach()}>{bridge?'Ask ChatGPT to explain':'Show teaching notes'}</button>{guidance&&<p className="guidance">{guidance}</p>}
 <button disabled={busy} onClick={()=>{stateRef.current=null;accessRef.current=null;setState(null);setAccess(null);setPly(null);setInvite('');setSpectator('');pending.current=null;setRetry(false);}}>Leave board / another game</button></>}
 {retry&&<button disabled={busy} onClick={()=>pending.current&&void operation('play',pending.current)}>Retry the same move request</button>}
 {error&&<p className="error" role="alert">{error}</p>}<footer>Games use temporary Vercel app memory: a restart or another instance may make a game unavailable before its seven-day expiry. Elapsed clocks include time away. Coaching uses authored notes, without engine evaluation. Player codes are stored on this device when supported and passed privately to your ChatGPT conversation when coaching.</footer></main>;
}
createRoot(document.getElementById('root')!).render(<Multiplayer/>);
