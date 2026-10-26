## Context
ChatGPT is the product interface. Vercel hosts application resources and request handlers; it does not itself install a ChatGPT app. The user knows chess rules and wants practical learning while playing.

## Goals / Non-Goals
Goals: play a complete human-versus-engine game inside ChatGPT, receive hints on request, explain grounded analysis, resume a game, and review three useful moments.
Non-goals for MVP: multiplayer, clocks, tournaments, opening courses, payments, custom model training, a separate chatbot, and public marketplace submission.

## Decisions
1. **Next.js App Router, TypeScript, Node.js runtime, npm, Node 22.** Host `/mcp` using the current supported MCP SDK and stateless Streamable HTTP transport. Serve the board as a registered MCP App resource using the host-supported bridge. Confirm resource metadata, CSP, MIME type, and tool visibility against current Apps SDK documentation in the first spike. The root web page only documents connection and service status.
2. **Host conversation supplies the coach.** Return structured position and engine facts for ChatGPT to explain. Do not introduce a second chat UI or backend model call for the MVP. Natural language is resolved to a concrete move by ChatGPT, then checked server-side. Ambiguous moves require clarification without mutation.
3. **Authoritative domain service using chess.js.** Reconstruct each position from initial FEN plus move history, validate every move, and persist FEN, SAN/UCI history, PGN, status, revision, player color, difficulty, and coaching preferences. Preserve full history for repetition detection.
4. **Durable PostgreSQL storage.** Use a managed provider compatible with Vercel; choose the provider at implementation setup. Store games, move records, idempotency keys, and analysis jobs. Transactions implement compare-and-swap revisions and a unique `(owner, game, requestId)` key. Process memory and browser storage are never the source of truth.
5. **Verified account ownership.** Implement the supported OAuth authorization/resource-server flow for remote ChatGPT apps. Validate token issuer, audience, expiry, and subject; bind the subject to every database operation. A game ID is not authorization. Provider selection is an implementation setup decision.
6. **Bounded Stockfish adapter.** Validate a server-compatible engine package in an early Vercel spike, including licensing and notices. Each position receives a fixed time budget (initial target 1 second, hard timeout 3 seconds) and normalized scores from White's perspective, with mate scores separate. Difficulty presets limit strength where supported and are not marketed as measured Elo. If a warm request cannot reliably fit Vercel limits, use an external engine worker behind the same adapter. Record this decision before shipping gameplay.
7. **Safe asynchronous opponent turn.** Persist a legal human move once, mark opponent turn pending, then obtain and validate the engine reply against that exact revision. Commit the reply transactionally. Timeouts preserve the human move and allow an idempotent retry; they never fabricate an opponent move or repeat the human move. Longer reviews use persisted jobs and polling, not process-local background work after a response.
8. **ChatGPT board.** React component with click/tap and keyboard selection, labeled squares, promotion selector, board orientation, last move, turn, check, history, and status. Board mutations use the same domain service as conversational tools. Return current state after conflicts and update model context through the supported bridge after accepted moves. A local browser harness is for development only.

## Tool Contract
All tools use JSON schemas, validate input server-side, return structured results and concise text, and use current MCP read-only/destructive/idempotency annotations appropriately. Game state includes `gameId`, `revision`, `fen`, `turn`, `status`, `history`, `playerColor`, and `pendingOpponentTurn`. No secret or token is returned to the model or widget.

| Tool | Inputs | Result / effect |
| --- | --- | --- |
| `new_game` | color, difficulty, coachingMode, requestId | Owned game and board resource; random color resolved once |
| `get_game` | gameId | Current authoritative state and board |
| `play_move` | gameId, expectedRevision, requestId, from/to/promotion or SAN | Validates and commits move; obtains reply or returns pending state |
| `retry_opponent_turn` | gameId, expectedRevision, requestId | Completes pending engine turn at most once |
| `get_hint` | gameId, revision, level 1–3 | Question, tactical theme, or explicit move; no game mutation |
| `explain_position` | gameId, revision, optional move | Grounded threats/plans and available analysis; no mutation |
| `review_game` | gameId, revision | Review status/job ID or up to three key moments and practice advice |
| `resign_game` | gameId, expectedRevision, requestId | Ends an active game |

Errors: `INVALID_MOVE`, `AMBIGUOUS_MOVE`, `REVISION_CONFLICT`, `NOT_FOUND` (also unauthorized games), `GAME_OVER`, `NOT_YOUR_TURN`, `ANALYSIS_UNAVAILABLE`, `RATE_LIMITED`. Replaying an identical request returns the original result; reusing its ID with different inputs is rejected. Analysis results carry FEN/revision, engine settings, score, and legal principal variation; stale analysis is not presented as current.

## Risks / Trade-offs
- ChatGPT account/developer access and app support must be verified; text tools are a useful diagnostic but do not fulfill the embedded-board acceptance criterion.
- Serverless engine startup, WASM/native packaging, CPU budgets, and Stockfish GPL obligations require measurement and review.
- The coach can still overinterpret engine facts. Distinguish verified variations from pedagogical suggestions and omit unsupported tactical claims.
- OAuth/database providers add setup. They provide continuity and ownership across requests and instances.

## Delivery and Rollout
First validate ChatGPT widget + MCP handshake and engine execution on a Vercel preview. Then implement domain/persistence, gameplay, coaching, and review. CI runs specs, type checking, lint, meaningful domain/integration tests, and Next.js production build. Trusted same-repository PRs may deploy previews using a separate preview Vercel project; main deploys production only after checks. Fork PRs run checks without deployment credentials. Do not use `pull_request_target`. GitHub Actions is the sole automatic deployment owner; disable duplicate Vercel Git deployments.

## Open Setup Decisions
- Managed PostgreSQL and OAuth providers, selected with available accounts.
- Verified Stockfish runtime/package versus external worker after the deployment spike.
- Vercel project IDs and stable production hostname for ChatGPT connection.
- Preview database isolation and preview OAuth callback configuration.

## First Implementation Slice: Ephemeral Practice Prototype
Before persistent games, expose `open_practice_board(moves?)` and `play_practice_move(moves, move)` as stateless position calculators. Inputs carry the complete SAN history from the standard starting position, and outputs contain FEN, history, revision, legal moves, and board squares. The widget uses the standard MCP Apps bridge and updates model context after a move. No process-local game store, account ownership, engine analysis, or game ID is implied. Both sides can be moved for practice. These tools remain separate from the production game contract above and are read-only with respect to server state. The local `/board` harness uses the same domain service via `/api/demo`. A public unauthenticated MCP endpoint is appropriate only for this bounded, nonpersistent prototype; OAuth and persistence remain prerequisites for saved games.

Deployment is opt-in through GitHub repository variable `VERCEL_DEPLOY_ENABLED=true` after environment secrets are configured. Checks run regardless. The repository ships a pinned CLI and a local setup script for the user's authenticated computer; credentials are never collected through chat. Vercel Git deployments are disabled in vercel.json so GitHub Actions owns automatic deployment.


## User-Selected Memory Prototype and Stable Game Sessions
The user chose best-effort Vercel app memory without another service. This exception applies to anonymous prototype games, not authenticated production saved games. A module cache holds at most 1,000 games, expiring one hour after their last move. `new_game` uses randomUUID once. The UUID remains unchanged through both players' moves, polling, resume, widget remount, and recovery. New games alone create new UUIDs. IDs identify anonymous games and do not implement account authentication.

`open_practice_board(gameId)` is read-only and cannot create/reset a game. `play_practice_move(gameId, expectedRevision, move)` requires identity and revision; there is no model-facing stateless fallback. `read_practice_board(gameId)` returns authoritative state. `recover_practice_board(gameId, moves, expectedRevision)` reconstructs a missing record under the SAME UUID, returns newer compatible state rather than rolling it back, and rejects divergent histories. Compare-and-swap is atomic within one process.

The board sends the turn request after human moves and polls the same UUID for replies. It also polls while idle so a conversational move or remounted view can receive a reply. Incoming results for other games, old revisions, or divergent histories cannot replace the displayed game. The browser persists legal history per UUID through localStorage and, when supported, window.openai widget state. Restore uses the incoming game UUID, never a global last-game key, and cannot rewind a newer snapshot. Sandboxed storage can be unavailable.

Only new/resume tools render a board resource; read/move/recovery tools remain headless. An already open board is not re-created after a reply. ChatGPT must commit before announcing a move. Resource URI v3 and a visible v0.3 label identify this release. The host can still close or remount its view; reopening by UUID must resume the game.

Vercel instances do not share memory. A UUID cannot make state durable or globally consistent. Recovery can lose an unseen reply and cannot solve routing. The user accepted these limitations. Authenticated durable games remain later work.
