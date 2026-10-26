## 1. Specification foundation
- [x] 1.1 Capture MVP proposal, architecture, capability scenarios, and deployment plan.
- [x] 1.2 Supply GitHub Actions and setup documentation with explicit scaffold gating.
- [x] 1.3 Run official OpenSpec strict validation.
- [x] 1.4 Publish files to hbahadorzadeh/chessbuddy.

## 2. Compatibility and project foundation
- [x] 2.1 Scaffold current stable Next.js App Router + TypeScript, pin compatible packages, and commit package-lock.json; add lint, typecheck, test, and build scripts.
- [x] 2.2 Install OpenSpec locally, pin its version in package-lock.json, initialize Codex integration, and use the local CLI in CI.
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

## 6. Integration prototype (first implementation slice)
- [x] 6.1 Add a stateless practice-board tool and legal next-position tool with complete move history inputs; explicitly exclude saved games and engine play from the prototype.
- [x] 6.2 Bundle a React MCP App with the standard host bridge, board moves, promotion choice, keyboard controls, and position context updates.
- [x] 6.3 Supply a browser harness and shared server validation plus domain/MCP tests.
- [x] 6.4 Add a local Vercel/GitHub setup script without embedding credentials.
- [ ] 6.5 Verify the deployed board inside ChatGPT after Vercel account configuration.


## 7. Automatic turns and one board (app memory, per user preference)
- [x] 7.1 Separate open-board rendering metadata from headless play, read, and recovery tools.
- [x] 7.2 Implement bounded instance-local memory with expiry, history isolation, and atomic per-process revisions; add no external service.
- [x] 7.3 Add automatic turn messages, same-view polling, timeout/cancel behavior, and explicit recovery without silent rollback.
- [x] 7.4 Test invalid and concurrent replies, expiry, eviction, cold-instance recovery, and MCP tool metadata.
- [x] 7.5 Verify CI, deployment, and live endpoint after publication.
- [ ] 7.6 Verify automatic handoff and board continuity in the user's browser ChatGPT session.

## 8. Cached board upgrade
- [x] 8.1 Version the board resource address and display v0.2 so old views are identifiable.
- [x] 8.2 Disable HTTP MCP response caching and clarify that opponent moves must be committed through the move tool.
- [x] 8.3 Verify deployment and ask the user to reconnect and test a fresh v0.2 board.

## 9. Stable game sessions
- [x] 9.1 Generate a UUID only for a new game and require the unchanged gameId on play/read/resume/recovery.
- [x] 9.2 Remove the model-facing stateless move fallback and make reopening read-only.
- [x] 9.3 Restore the same UUID after memory loss while rejecting rollback and conflicting history.
- [x] 9.4 Preserve per-game browser/host snapshots and reject other-game or stale incoming state; poll while idle too.
- [x] 9.5 Add tests for UUID lifecycle, concurrent replies, cold recovery, and view restoration.
- [ ] 9.6 Verify deployed session lifecycle and browser behavior in ChatGPT.
