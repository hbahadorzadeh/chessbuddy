# ChessBuddy
Learn chess inside ChatGPT, with a playable board and a conversation about the position.

**Status: integration prototype.** Next.js hosts an MCP server and an embedded React board. Each game has one stable UUID used for both players’ moves, reopening, and recovery. The server validates moves using the complete history stored in best-effort app memory. There are no saved games, accounts, engine opponent, or engine-backed hints yet.

## Run locally
Requires Node 22 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/board for the browser harness. The home page explains the ChatGPT connection; the MCP endpoint is http://localhost:3000/mcp. The browser harness is for development; ChatGPT is the intended interface.

```sh
npm run typecheck
npm run lint
npm test
npm run spec:validate
npm run build
# With npm start running, check the HTTP/MCP integration:
node scripts/smoke.mjs
```

## Configure Vercel from your authenticated computer
Clone this repository and run:

```sh
bash scripts/setup-vercel.sh
```

You need authenticated Vercel and GitHub CLIs (run `vercel login` and `gh auth login` locally if necessary). The script links `chessbuddy` and `chessbuddy-preview` under your chosen Vercel account/team and sets the GitHub environment secrets. It prompts for a scoped Vercel token locally with hidden input. Never paste credentials into chat.

After the application commit is on main, enable deployment:

```sh
gh variable set VERCEL_DEPLOY_ENABLED --repo hbahadorzadeh/chessbuddy --body true
gh workflow run ci-deploy.yml --repo hbahadorzadeh/chessbuddy --ref main
```

See [deployment instructions](docs/deployment.md) for account protections and ChatGPT acceptance checks.

## Connect in ChatGPT
Use the deployed HTTPS `/mcp` endpoint in ChatGPT's developer/custom-app connection flow (where available). This prototype has no authentication because it stores no private data. Ask “Open a ChessBuddy practice board,” play e4 on the board, then ask “What position is on the board?” Confirm ChatGPT sees Black to move and the updated FEN/history. Conversational moves must use the latest complete move history. Rendering and context synchronization in an actual ChatGPT session remain unverified until deployment and connection.

## Project specification
- [Proposal](openspec/changes/define-chessbuddy-mvp/proposal.md)
- [Architecture and tool contracts](openspec/changes/define-chessbuddy-mvp/design.md)
- [Capability requirements](openspec/changes/define-chessbuddy-mvp/specs)
- [Implementation checklist](openspec/changes/define-chessbuddy-mvp/tasks.md)

OpenSpec CLI and Codex workflows are installed. The active change stays open until the full MVP acceptance criteria pass. Next milestones prove Vercel/ChatGPT compatibility and Stockfish execution, then add authenticated saved games, engine play, progressive hints, and review.


## Games and sessions
Each `new_game` call creates a fresh UUID. Every move, read, reopen, and recovery requires that same `gameId`; reopening never creates a replacement game. The board displays its UUID and revision. `play_practice_move` requires `gameId`, `expectedRevision`, and a legal SAN/UCI move. There is no stateless fallback that can announce a move without updating a game.

The board sends an opponent-turn request automatically, polls for committed moves, and applies only non-regressing updates for its own UUID. ChatGPT must commit its move through the tool before announcing it. Only new/resume tools render a board; move, read, and recovery tools do not.

History is saved per UUID in browser storage and, where available, host widget state. A remounted view can restore its newer accepted history without mixing games. Sandboxed storage may be unavailable. A reconnect to the same game must use `open_practice_board(gameId)`, not `new_game`. The current view shows **Live board · v0.4** and a game UUID.

## App memory on Vercel
No database or additional service is required. Anonymous game positions live in a bounded process-memory cache: at most 1,000 games, expiring seven days after the last committed move. Vercel instances do not share this cache and can restart, so synchronization remains best-effort. A UUID identifies a game; it does not make memory persistent.

The board preserves displayed history if a server position is missing, older, or conflicting. **Recover from history** restores that same UUID and history; it never generates another ID or overwrites newer/conflicting history. Recovery can lose an unseen reply and cannot eliminate instance routing issues. Cancellation stops local waiting, not a ChatGPT turn already submitted.

## Timers and move tracker
Each UUID carries an elapsed game timer, White/Black thinking-time totals and move counts, and a per-move SAN/duration ledger. These are elapsed clocks, not countdown time controls: the active player's time includes time away and ChatGPT response latency. They freeze at game end. Timings survive recovery when the browser snapshot contains them; missing historical timings are shown as unknown instead of invented.

The seven-day retention window starts again on a committed move; reads do not extend it. Expired browser snapshots are ignored and cleaned on access. Instance restarts and the bounded cache can remove games sooner; no one-week availability guarantee is possible with Vercel app memory.

## Chess teaching knowledge
The bundled catalogue contains 20 standard opening lines and 10 original lessons with legal illustrative examples. get_chess_guidance matches exact positions (including transpositions), returns legal opening candidates and verified one-move mates, and can check whether a proposed move allows mate in one. It supports progressive question/concept/move hints. Read chessbuddy://knowledge/guide through MCP for the complete catalogue.

Source: standard opening theory with original assistant-authored teaching notes. chess.js validates legality; the data has NOT been verified against Lichess game statistics or Stockfish. No win rates, engine scores, or professional-strength claims are supplied. Such sourced analysis remains future work. The catalogue is bundled, so no database or external gameplay service is needed.

Refresh app tools and open the v0.4 board to see timers and the move tracker. Existing game UUIDs remain unchanged when resumed.

## Replay and strategy review
Ask ChatGPT to **replay this game from move …**, supplying its game UUID, PGN, or SAN/UCI moves. The replay is a separate immutable recording and cannot change your live game. It supports next/previous, first/last, jump, autoplay/pause, recorded-time playback, and speed controls. Use **Ask ChatGPT about this position** to discuss the displayed position. You can also try the import viewer at `/replay`.

A replay can start from **any legal FEN**, including Black to move in the middle of a game. `startPly` is the half-move index relative to that supplied initial position: 0 shows the initial FEN, 1 shows the first supplied move, and so on. PGN SetUp/FEN headers are respected. You can supply a full PGN with a later startPly, or supply only a continuation plus its initialFen.

For example, a tool request can use:

```json
{"initialFen":"6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 19","moves":["Re8#"],"startPly":0,"durationsMs":[5000]}
```

Famous games can be reviewed by importing their PGN; player/event headers are not independently authenticated and no historical database is bundled. Per-move timings come from the current game's ledger, explicit durationsMs, or PGN `%emt h:mm:ss` comments. `%clk` is a clock balance and is not guessed into an elapsed duration. Missing durations use a 1.5-second study pace, scaled by speed; rendering has a 50 ms minimum interval. Recorded player totals show only the supplied replay segment and identify partial timing.

Autoplay runs locally to avoid adding server latency to every step. It publishes the viewed position to ChatGPT context; pausing/reviewing commits the selected cursor. Model seeks are picked up through polling and pause playback. Replay storage is bounded app memory with seven-day expiry from import, so synchronization can be lost on Vercel; the loaded local sequence stays usable. Active-game retention remains seven days after the last committed move.
