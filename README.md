# ChessBuddy
Learn chess inside ChatGPT, with a playable board and a conversation about the position.

**Status: integration prototype.** Next.js hosts a stateless MCP server and an embedded React board. You can open a practice position and play legal moves using the board or conversation. The server reconstructs each position from its complete move history. There are no saved games, accounts, engine opponent, or engine-backed hints yet.

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


## Automatic turns and one live board
Inside ChatGPT, **Ask ChatGPT to reply after my moves** is enabled by default. A player move sends the next-turn request automatically. ChatGPT calls a headless move tool; the existing board polls for the reply and updates in place. Refresh the app's tool definitions and open a new board after this update. Only the explicit open-board tool creates a board view.

No database or additional service is required. Anonymous positions live in a bounded process-memory cache: at most 1,000 boards, expiring one hour after the last move. Vercel instances do not share this cache and can restart at any time, so synchronization is best-effort. A reply can be unavailable if requests reach different instances. This is a prototype, not durable saved games.

The browser preserves its displayed move history when a server position is missing, older, or conflicting. Try **Check for reply** first. **Recover from history** creates a fresh anonymous key from the displayed moves without creating another board; a reply to the old key may be lost. Recovery does not guarantee requests will keep reaching the same Vercel instance. Cancelling waiting stops local polling, not a ChatGPT turn already submitted. ChatGPT chooses moves here; Stockfish-backed strength remains future work.
