import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {multiplayerGames,type SharedGame} from '../lib/multiplayer';
import {createMemoryMultiplayerStore,multiplayerStore,type MultiplayerStore} from '../lib/multiplayer-store';
import {GAME_RETENTION_MS} from '../lib/game-stats';
import {multiplayerLinks,multiplayerCommandResult} from '../lib/multiplayer-commands';
function fixture(){let time=1_000_000;const store=createMemoryMultiplayerStore({now:()=>time});const games=multiplayerGames(()=>store,()=>time);return {store,games,setTime:(t:number)=>time=t,now:()=>time};}
async function pair(f=fixture(),color:'White'|'Black'='White'){
 const owner=await f.games.create(color);const other=await f.games.join(owner.gameId);
 return {...f,owner,other,white:{gameId:owner.gameId,code:(color==='White'?owner:other).playerCode},black:{gameId:owner.gameId,code:(color==='Black'?owner:other).playerCode}};
}
test('invitation acceptance is atomic and codes never appear in links or stored records',async()=>{
 const f=fixture();const owner=await f.games.create('Black');
 const claims=await Promise.allSettled([f.games.join(owner.gameId),f.games.join(owner.gameId)]);
 assert.equal(claims.filter(r=>r.status==='fulfilled').length,1);assert.equal(claims.filter(r=>r.status==='rejected').length,1);
 const other=claims.find(r=>r.status==='fulfilled')!;assert.equal(other.status,'fulfilled');if(other.status!=='fulfilled')return;
 assert.equal(other.value.playerColor,'White');assert.notEqual(owner.playerCode,other.value.playerCode);assert.equal(owner.playerCode.length,32);
 const stored=JSON.stringify(await f.store.read(owner.gameId));assert.ok(!stored.includes(owner.playerCode));assert.ok(!stored.includes(other.value.playerCode));
 const links=multiplayerLinks(owner,'https://example.com');assert.ok(links.invitationLink?.endsWith(owner.gameId));assert.ok(!links.invitationLink?.includes(owner.playerCode));
 await assert.rejects(f.games.read({gameId:owner.gameId,code:'a'.repeat(32)}),/ACCESS_DENIED/);
 await assert.rejects(f.games.read({gameId:owner.gameId,code:owner.gameId}),/Invalid/);
});
test('creator can revoke invitations; neither the other player nor spectators can manage sharing',async()=>{
 const f=fixture(),owner=await f.games.create();const access={gameId:owner.gameId,code:owner.playerCode};
 await f.games.sharing(access,'invitation',false);await assert.rejects(f.games.join(owner.gameId),/INVITATION_CLOSED/);
 await f.games.sharing(access,'invitation',true);const other=await f.games.join(owner.gameId);
 await assert.rejects(f.games.sharing({gameId:owner.gameId,code:other.playerCode},'spectator',true),/ACCESS_DENIED/);
 await assert.rejects(f.games.sharing(access,'invitation',true),/INVITATION_CLOSED/);
});
test('turns, illegal/stale moves, concurrent identical retries and conflicting request reuse',async()=>{
 const f=await pair();const requestId=randomUUID();
 await assert.rejects(f.games.play(f.black,0,requestId,'e5'),/NOT_YOUR_TURN/);
 await assert.rejects(f.games.play(f.white,0,randomUUID(),'e5'));
 f.setTime(f.now()+2500);
 const [a,b]=await Promise.all([f.games.play(f.white,0,requestId,'e4'),f.games.play(f.white,0,requestId,'e4')]);
 assert.deepEqual(a.position.moves,['e4']);assert.deepEqual(b.position.moves,['e4']);assert.deepEqual(a.position.timing,b.position.timing);assert.equal(a.position.timing.whiteMs,2500);
 await assert.rejects(f.games.play(f.white,0,requestId,'d4'),/REQUEST_CONFLICT/);
 await assert.rejects(f.games.play(f.black,0,randomUUID(),'e5'),/REVISION_CONFLICT/);
 f.setTime(f.now()+3000);const reply=await f.games.play(f.black,1,randomUUID(),'c5');
 assert.deepEqual(reply.position.moves,['e4','c5']);assert.equal(reply.position.timing.blackMs,3000);
 // Retrying an old accepted command after another move returns current state, without clock charge.
 const retry=await f.games.play(f.white,0,requestId,'e4');assert.deepEqual(retry.position.moves,['e4','c5']);assert.equal(retry.position.timing.whiteMs,2500);
});
test('two distinct moves at same revision cannot both commit',async()=>{
 const f=await pair();const moves=await Promise.allSettled([f.games.play(f.white,0,randomUUID(),'e4'),f.games.play(f.white,0,randomUUID(),'d4')]);
 assert.equal(moves.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.games.read(f.white)).position.moves.length,1);
});
test('spectators see no player secrets/preferences, cannot move and old links are revoked',async()=>{
 const f=await pair();const ownerAccess={gameId:f.owner.gameId,code:f.owner.playerCode};
 const sharing=await f.games.sharing(ownerAccess,'spectator',true);const spectator={gameId:f.owner.gameId,code:sharing.spectatorCode!};
 const view=await f.games.read(spectator);assert.equal(view.role,'spectator');assert.equal(view.playerColor,null);assert.equal(view.coachingMode,'explanations');assert.ok(!JSON.stringify(view).includes(f.owner.playerCode));assert.ok(!JSON.stringify(view).includes('hash'));
 await assert.rejects(f.games.play(spectator,0,randomUUID(),'e4'),/ACCESS_DENIED/);
 await assert.rejects(f.games.settings(spectator,'suggestions'),/ACCESS_DENIED/);
 await assert.rejects(f.games.sharing(spectator,'spectator',true),/ACCESS_DENIED/);
 const link=multiplayerLinks(sharing,'https://example.com').spectatorLink!;const url=new URL(link);assert.equal(url.searchParams.get('gameId'),f.owner.gameId);assert.ok(!url.search.includes(spectator.code));assert.ok(url.hash.includes(spectator.code));
 await f.games.sharing(ownerAccess,'spectator',true);await assert.rejects(f.games.read(spectator),/ACCESS_DENIED/);await assert.rejects(f.games.guidance(spectator,0),/ACCESS_DENIED/);
 const newest=await f.games.sharing(ownerAccess,'spectator',true);await f.games.sharing(ownerAccess,'spectator',false);await assert.rejects(f.games.read({gameId:f.owner.gameId,code:newest.spectatorCode!}),/ACCESS_DENIED/);
});
test('coaching is independent, never mutates moves, and hints/explanations strip candidates',async()=>{
 const f=await pair();await f.games.settings(f.white,'suggestions');await f.games.settings(f.black,'explanations');
 const advice=await f.games.guidance(f.white,0);assert.ok(advice.openingCandidates?.length);
 const explanation=await f.games.guidance(f.black,0,'move');assert.equal(explanation.openingCandidates,undefined);assert.equal(explanation.verifiedMateInOne,undefined);assert.ok(explanation.instruction.includes('Do not suggest'));
 await f.games.settings(f.white,'hints');const hint=await f.games.guidance(f.white,0,'move');assert.equal(hint.openingCandidates,undefined);assert.equal(hint.verifiedMateInOne,undefined);
 assert.equal((await f.games.read(f.black)).coachingMode,'explanations');assert.deepEqual((await f.games.read(f.white)).position.moves,[]);
 await assert.rejects(f.games.guidance(f.white,1),/REVISION_CONFLICT/);await assert.rejects(f.games.guidance(f.white,0,'concept',0),/REPLAY_UNAVAILABLE/);
});
test('completed game analysis is local by ply, preserves live record and clocks freeze',async()=>{
 const f=await pair();for(const [i,move]of ['f3','e5','g4','Qh4#'].entries()){f.setTime(f.now()+1000);await f.games.play(i%2===0?f.white:f.black,i,randomUUID(),move);}
 const final=await f.games.read(f.white);assert.equal(final.position.status,'checkmate');
 const before=await f.store.read(final.gameId);const review=await f.games.guidance(f.white,4,'concept',2);assert.equal(review.ply,2);assert.equal(review.revision,2);assert.notEqual(review.fen,final.position.fen);assert.deepEqual(await f.store.read(final.gameId),before);
 await assert.rejects(f.games.guidance(f.white,4,'concept',5),/REPLAY_UNAVAILABLE/);await assert.rejects(f.games.play(f.white,4,randomUUID(),'e4'),/finished/);
 f.setTime(f.now()+5000);assert.equal((await f.games.read(f.white)).position.stats.white.thinkingMs,2000);
});
test('seven-day deadline is fixed despite joining, moving, settings and sharing; no cold recovery',async()=>{
 const f=fixture(),owner=await f.games.create();f.setTime(f.now()+10000);const other=await f.games.join(owner.gameId);const a={gameId:owner.gameId,code:owner.playerCode};
 await f.games.play(a,0,randomUUID(),'e4');await f.games.settings(a,'suggestions');await f.games.sharing(a,'spectator',true);
 const game=await f.games.read(a);assert.equal(game.expiresAt,owner.createdAt+GAME_RETENTION_MS);assert.equal(game.position.stats.expiresAt,game.expiresAt);
 const cold=multiplayerGames(()=>createMemoryMultiplayerStore(),()=>f.now());await assert.rejects(cold.read(a),/GAME_UNAVAILABLE/);
 f.setTime(game.expiresAt);await assert.rejects(f.games.read(a),/GAME_UNAVAILABLE/);await assert.rejects(f.games.join(owner.gameId),/GAME_UNAVAILABLE/);assert.equal(await f.store.read(owner.gameId),null);assert.notEqual(owner.playerCode,other.playerCode);
});
test('memory is clone-isolated, capacity bounded, and API/MCP services share one process map',async()=>{
 let now=1000;const bounded=createMemoryMultiplayerStore({maxGames:1,now:()=>now});assert.equal(await bounded.create('one',{version:0,expiresAt:2000}),true);
 const copy=await bounded.read('one');copy!.version=9;assert.equal((await bounded.read('one'))!.version,0);
 await assert.rejects(bounded.create('two',{version:0,expiresAt:3000}),/CAPACITY_REACHED/);now=2000;assert.equal(await bounded.create('two',{version:0,expiresAt:3000}),true);
 assert.equal(await bounded.compareAndSwap('two',1,{version:2,expiresAt:3000}),false);
 const a=multiplayerGames(multiplayerStore),b=multiplayerGames(multiplayerStore);const game=await a.create();const access={gameId:game.gameId,code:game.playerCode};assert.equal((await b.read(access)).gameId,game.gameId);
 const raw=await multiplayerStore().read(game.gameId) as SharedGame;assert.equal(raw.gameId,game.gameId);
 const web=await multiplayerCommandResult({action:'read',...access});assert.equal('gameId'in web&&web.gameId,game.gameId);
 const failing:MultiplayerStore={async create(){throw new Error('storage failed');},async read(){throw new Error('storage failed');},async compareAndSwap(){throw new Error('storage failed');}};await assert.rejects(multiplayerGames(()=>failing).create(),/storage failed/);
});
