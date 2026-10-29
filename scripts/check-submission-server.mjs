import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Chess} from 'chess.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client=new Client({name:'chessbuddy-submission-validation',version:'0.6.0'});
const deadline=setTimeout(()=>{console.error('Live MCP verification timed out.');process.exit(1);},240000);
deadline.unref();
const apiChecks=[];
class Blocked extends Error {}
async function tool(name,args={}){
 const result=await client.callTool({name,arguments:args});
 if(result.isError || result.structuredContent?.status==='recovery_required'){
  const text=result.content?.filter(c=>c.type==='text').map(c=>c.text).join(' ')||'Unexpected tool error';
  if(/GAME_UNAVAILABLE|REPLAY_UNAVAILABLE/.test(text))throw new Blocked('The selected Vercel process did not have the temporary record.');
  throw new Error(name+': '+text);
 }
 return result.structuredContent;
}
async function check(name,body){
 try {await body();apiChecks.push({name,status:'Passed'});}
 catch(error){apiChecks.push({name,status:error instanceof Blocked?'Blocked':'Failed',reason:error.message});}
}
const snapshot=s=>({gameId:s.gameId,moves:s.moves,timing:s.timing,expiresAt:s.stats.expiresAt});
try {
 await client.connect(new StreamableHTTPClientTransport(new URL('https://chessbuddy-self.vercel.app/mcp')));
 const listed=await client.listTools();
 assert.equal(listed.tools.length,18);
 const mutations=new Set(['new_game','play_practice_move','recover_practice_board','create_replay','seek_replay',
  'create_multiplayer_game','join_multiplayer_game','play_multiplayer_move','set_multiplayer_coaching','manage_multiplayer_sharing']);
 for(const t of listed.tools){
  for(const key of ['readOnlyHint','openWorldHint','destructiveHint'])assert.equal(typeof t.annotations?.[key],'boolean',t.name+' '+key);
  assert.equal(t.annotations.readOnlyHint,!mutations.has(t.name),t.name+' read/mutation classification');
 }
 const resources=['ui://chessbuddy/practice-board-v5.html','ui://chessbuddy/replay-v1.html','ui://chessbuddy/multiplayer-v1.html'];
 for(const uri of resources){const r=await client.readResource({uri});assert.match(r.contents[0].text,/<div id="root">/);}
 await check('Solo API continuity, legal moves, clocks and nonspoiling guidance',async()=>{
  const initial=await tool('new_game');
  assert.equal(initial.revision,0);assert.match(initial.gameId,/^[0-9a-f-]{36}$/i);
  const after=await tool('play_practice_move',{gameId:initial.gameId,snapshot:snapshot(initial),expectedRevision:0,move:'e4'});
  assert.deepEqual(after.moves,['e4']);assert.equal(after.gameId,initial.gameId);
  const hint=await tool('get_chess_guidance',{gameId:after.gameId,snapshot:snapshot(after),expectedRevision:1,mode:'hint',hintLevel:'question'});
  assert.equal(hint.revision,1);assert.equal(hint.fen,after.fen);assert.equal(hint.openingCandidates,undefined);assert.equal(hint.verifiedMateInOne,undefined);
  const reply=await tool('play_practice_move',{gameId:after.gameId,snapshot:snapshot(after),expectedRevision:1,move:'c5'});
  assert.deepEqual(reply.moves,['e4','c5']);assert.equal(reply.gameId,initial.gameId);
  assert.equal(reply.stats.moveLog.length,2);assert.equal(reply.stats.white.moves,1);assert.equal(reply.stats.black.moves,1);
  const same=await tool('read_practice_board',{gameId:reply.gameId,snapshot:snapshot(reply)});
  assert.deepEqual(same.moves,reply.moves);
 });
 await check('Mid-game FEN replay API, original numbering and durations',async()=>{
  const fen='r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b kq - 1 6';
  const replay=await tool('create_replay',{initialFen:fen,moves:['O-O','Re1','a6','Bb3'],durationsMs:[2000,3000,1500,null],startPly:1});
  const expected=new Chess(fen);expected.move('O-O');
  assert.equal(replay.cursor,1);assert.equal(replay.frames[0].fen,new Chess(fen).fen());assert.equal(replay.frames[1].fen,expected.fen());
  assert.equal(replay.frames[1].player,'Black');assert.equal(replay.frames[1].moveNumber,6);assert.equal(replay.frames[2].moveNumber,7);
  assert.deepEqual(replay.frames.slice(1).map(f=>f.durationMs),[2000,3000,1500,null]);
  const advice=await tool('get_replay_guidance',{replayId:replay.replayId,ply:1});
  assert.equal(advice.fen,replay.frames[1].fen);
 });
 await check('Multiplayer API invitations, private coaching, retry protection and spectator revocation',async()=>{
  const owner=await tool('create_multiplayer_game',{color:'White',coachingMode:'hints'});
  assert.ok(!owner.invitationLink.includes(owner.playerCode));
  const guest=await tool('join_multiplayer_game',{gameId:owner.gameId,coachingMode:'explanations'});
  assert.notEqual(owner.playerCode,guest.playerCode);
  const white={gameId:owner.gameId,code:owner.playerCode},black={gameId:owner.gameId,code:guest.playerCode};
  const hint=await tool('get_multiplayer_guidance',{...white,expectedRevision:0,hintLevel:'move'});
  assert.equal(hint.openingCandidates,undefined);assert.equal(hint.verifiedMateInOne,undefined);
  const request={...white,expectedRevision:0,requestId:randomUUID(),move:'e4'};
  const moved=await tool('play_multiplayer_move',request),retry=await tool('play_multiplayer_move',request);
  assert.deepEqual(moved.position.moves,['e4']);assert.deepEqual(retry.position.moves,['e4']);assert.deepEqual(retry.position.timing,moved.position.timing);
  const advice=await tool('get_multiplayer_guidance',{...black,expectedRevision:1});
  assert.equal(advice.coachingMode,'explanations');assert.equal(advice.openingCandidates,undefined);
  const shared=await tool('manage_multiplayer_sharing',{...white,kind:'spectator',enabled:true});
  const spectator={gameId:owner.gameId,code:shared.spectatorCode};
  const observed=await tool('read_multiplayer_game',spectator);
  assert.equal(observed.role,'spectator');assert.ok(!JSON.stringify(observed).includes(owner.playerCode));assert.ok(!JSON.stringify(observed).includes(guest.playerCode));
  const denied=await client.callTool({name:'play_multiplayer_move',arguments:{...spectator,expectedRevision:1,requestId:randomUUID(),move:'e5'}});
  assert.equal(denied.isError,true);assert.match(JSON.stringify(denied.content),/ACCESS_DENIED/);
  await tool('manage_multiplayer_sharing',{...white,kind:'spectator',enabled:false});
  const revoked=await client.callTool({name:'read_multiplayer_game',arguments:spectator});
  assert.equal(revoked.isError,true);assert.match(JSON.stringify(revoked.content),/ACCESS_DENIED/);
 });
 const report={endpoint:'https://chessbuddy-self.vercel.app/mcp',toolCount:listed.tools.length,
  tools:listed.tools.map(t=>({name:t.name,annotations:t.annotations})),resources,accountAuthentication:'none',
  apiChecks,mutatingToolsExecuted:true,onlyFreshTestGamesUsed:true,inHostReviewCasesRun:false,
  distinction:'API checks do not verify model tool choice, private ChatGPT conversations, host rendering or actual review cases.'};
 await writeFile('dist/live-mcp-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('Live MCP handshake, 18 tools, annotations and three resources passed.');
 console.log(JSON.stringify(apiChecks,null,2));
 assert.ok(!apiChecks.some(c=>c.status==='Failed'),'A live API check failed; inspect live-mcp-report.json.');
} finally {clearTimeout(deadline);await client.close();}
