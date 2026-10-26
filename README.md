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

History is saved per UUID in browser storage and, where available, host widget state. A remounted view can restore its newer accepted history without mixing games. Sandboxed storage may be unavailable. A reconnect to the same game must use `open_practice_board(gameId)`, not `new_game`. The current view shows **Live board · v0.3** and a game UUID.

## App memory on Vercel
No database or additional service is required. Anonymous game positions live in a bounded process-memory cache: at most 1,000 games, expiring one hour after the last move. Vercel instances do not share this cache and can restart, so synchronization remains best-effort. A UUID identifies a game; it does not make memory persistent.

The board preserves displayed history if a server position is missing, older, or conflicting. **Recover from history** restores that same UUID and history; it never generates another ID or overwrites newer/conflicting history. Recovery can lose an unseen reply and cannot eliminate instance routing issues. Cancellation stops local waiting, not a ChatGPT turn already submitted.
