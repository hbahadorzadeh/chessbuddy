## 1. Specification foundation
- [x] 1.1 Capture MVP proposal, architecture, capability scenarios, and deployment plan.
- [x] 1.2 Supply GitHub Actions and setup documentation with explicit scaffold gating.
- [ ] 1.3 Run official OpenSpec strict validation (CLI installation blocked by environment networking).
- [x] 1.4 Publish files to hbahadorzadeh/chessbuddy.

## 2. Compatibility and project foundation
- [ ] 2.1 Scaffold current stable Next.js App Router + TypeScript, pin compatible packages, and commit package-lock.json; add lint, typecheck, test, and build scripts.
- [ ] 2.2 Install OpenSpec locally, pin its version in package-lock.json, initialize Codex integration, and use the local CLI in CI.
- [ ] 2.3 Read current Apps SDK and MCP Extensions guidance; prove MCP handshake, board resource rendering, widget tool calls, and model-context synchronization inside ChatGPT on a Vercel preview.
- [ ] 2.4 Measure Stockfish cold/warm latency and enforce timeout; decide package/worker, deployment limits, and licensing notices.
- [ ] 2.5 Configure OAuth, owned PostgreSQL schema/migrations, and separate preview/production data.

## 3. Playable game
- [ ] 3.1 Implement authoritative rules and terminal states with full move history.
- [ ] 3.2 Implement transactional revisions, idempotent commands, and pending engine-turn recovery.
- [ ] 3.3 Implement tools, auth checks, schemas, annotations, rate limits, and structured errors.
- [ ] 3.4 Implement accessible board, orientation, legal targets, promotions, and state reconciliation.
- [ ] 3.5 Test castling, en passant, underpromotion, self-check, mate, stalemate, repetition/draw rules, ambiguous moves, stale revisions, duplicate commands, cross-owner access, and engine timeout/retry.

## 4. Learning experience
- [ ] 4.1 Implement three hint levels and coaching mode preferences without unsolicited best-move spoilers.
- [ ] 4.2 Return position-grounded analysis with explicit score perspective, mate handling, and unavailable-analysis behavior.
- [ ] 4.3 Implement persisted review jobs and three key moments with replayable positions and one next practice goal.
- [ ] 4.4 Verify hints do not mutate games, analysis revisions match, legal variations replay, and timeouts preserve state.

## 5. Delivery and acceptance
- [ ] 5.1 Supply Vercel production and preview projects, scoped secrets, environment protections, stable hostname, and disable duplicate Git deployments.
- [ ] 5.2 Run CI and preview/production workflows; verify fork PRs cannot access deployment secrets and failures prevent deploys.
- [ ] 5.3 Connect the deployed MCP app to ChatGPT; complete a game using board and conversation, request hints, recover an interrupted turn, resume across sessions, and review it.
- [ ] 5.4 Verify keyboard/mobile board operation, owner isolation, secret redaction, latency budgets, and migration/rollback procedures.
- [ ] 5.5 Archive the OpenSpec change only after acceptance; promote delta specs into openspec/specs.
