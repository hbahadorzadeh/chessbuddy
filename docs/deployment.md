# Deployment and ChatGPT verification

The Next.js scaffold, pinned dependencies/lockfile, MCP practice tools, and embedded board are implemented. GitHub Actions runs strict OpenSpec checks, typecheck, lint, tests, and production build. Deployments are disabled until repository variable `VERCEL_DEPLOY_ENABLED` is `true`.

## Vercel and GitHub account setup
Run `bash scripts/setup-vercel.sh` on the computer where Vercel is authenticated. Install/authenticate GitHub CLI first. The script asks for the Vercel account/team slug, links or creates `chessbuddy` and `chessbuddy-preview`, creates GitHub environments `production` and `preview`, and writes their project/org IDs using GitHub CLI. It prompts for a Vercel token locally with hidden input and sends it to both environments. Use a token scoped to the selected Vercel account/team, with access to both projects. Never commit it or send it through chat.

The same secret names are used in each environment: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Project IDs differ. Check new projects use Next.js, root directory `.`, and Node 22. The repository's vercel.json disables automatic Git deployments; GitHub Actions owns deployment. Preview has no production data or credentials.

Restrict production to main in GitHub environment settings. Configure preview approval according to collaborator trust: same-repository PR code executes with preview deployment secrets. Fork PRs run checks only and never deploy. The workflow does not use pull_request_target. For private repositories, verify GitHub plan support for environment secrets/protections.

When configuration is complete and the app commit is on main:

```sh
gh variable set VERCEL_DEPLOY_ENABLED --repo hbahadorzadeh/chessbuddy --body true
gh workflow run ci-deploy.yml --repo hbahadorzadeh/chessbuddy --ref main
gh run list --repo hbahadorzadeh/chessbuddy --limit 5
```

If this change is still on a PR branch, merge it after checks pass before dispatching main. To test preview deployment, enable the variable and update/re-run the same-repository PR workflow. Missing secrets fail the deployment job clearly before calling Vercel. Failed checks block deployment. The workflow records the deployment URL in its job summary and GitHub environment.

The deploy job pulls target-specific Vercel settings, builds Vercel output, then deploys that prebuilt output. The generic check build runs without account credentials. Generated board HTML is built before Next.js and traced into `/mcp` and `/board` functions.

## First ChatGPT connection
1. Use an accessible HTTPS deployment. If Vercel deployment protection blocks ChatGPT from fetching MCP, configure intended access for this nonprivate prototype or use a suitable accessible deployment. Do not put protection bypass secrets in committed URLs.
2. Add `https://YOUR-DEPLOYMENT/mcp` using ChatGPT's developer/custom-app connection flow, where supported. Select no authentication for this stateless public prototype. Deploying to Vercel does not automatically install an app in ChatGPT.
3. Ask “Open a ChessBuddy practice board.” Verify the embedded board renders, rather than only a text result.
4. Play e2–e4 using the board. Check Black to move and ask ChatGPT for the current FEN/history. The model should receive the updated position through the MCP Apps bridge.
5. Ask “Play e5.” Verify the latest complete history is sent, server legality validation succeeds, and the displayed position updates.
6. Try an illegal move, keyboard controls, a narrow mobile width, promotion, and a new practice board. Confirm clear failure messages and no invented engine analysis.

These in-host checks remain pending until deployment and a ChatGPT connection are available. Unit/integration tests validate the MCP protocol and move rules; they cannot establish that ChatGPT rendered the view.

## Next stages and rollback
Saved games require verified OAuth ownership, durable storage, revision/idempotency protection, and isolated environment configuration before shipping. The Stockfish runtime must be measured on Vercel before engine play or analysis is promised. No OpenAI API key is needed for the host conversation.

Record the last healthy production deployment. Roll back by promoting it in Vercel, then verify the stable MCP URL and board resource. Once a database exists, use backward-compatible migrations; a code rollback does not undo database migrations.


## Live games with app memory
No database or new credentials are required. A module-level cache holds at most 1,000 games per warm process, expiring seven days after the last committed move. Each game uses a UUID created once by `new_game`. All other tools require that same UUID. Reopening is read-only; recovery restores the same UUID. UUIDs are anonymous identifiers, not account authentication; do not post active game IDs publicly.

Vercel may route requests to separate instances or discard process memory. This is explicitly best-effort and does not implement durable saved games. Revision checks are atomic only within one process. Browser storage and supported host widget state retain the visible history per UUID; those can be unavailable in sandboxed views. Recovery refuses to overwrite newer/conflicting server history and cannot recover an unseen reply from another instance.

After deployment refresh app tools and open a **new_game** once. Verify **Live board · v0.4** and copy its UUID. Play e4 and have ChatGPT commit c5; verify the UUID stays unchanged, history is e4/c5, and revision is 2. Reopen using open_practice_board with that UUID; it must resume, not reset. A second explicitly new game must receive a different UUID. When testing memory loss, use recover_practice_board with the existing UUID, complete moves, and matching expectedRevision, then reopen the same UUID.

An HTTP smoke test verifies a running server and session identity; ChatGPT panel lifetime and browser turn handoff must still be tested inside the host. The application cannot prevent the host from closing its view, but reopening by UUID must not create a new game.

## Clocks, retention, and knowledge checks
Game payloads include timing metadata, per-player move/time totals, a move ledger, and expiresAt. UI clocks tick locally from server timestamps; the active side runs continuously, including disconnected time, and clocks freeze at game over. Same-UUID recovery accepts validated timing metadata. Without historical timestamps the restored game is explicitly approximate. Anonymous timings are not competition-grade or tamper-proof.

Cache and browser snapshots target seven-day expiry from the last committed move. Reads/guidance do not extend it; warm-instance loss or capacity eviction can remove games earlier. No retention guarantee or new external store is implied.

The knowledge catalogue and retrieval code are bundled. Guidance is read-only and revision-scoped; its tool does not render another board. Verify legal exact-position candidates after e4, a nonspoiling hint, and no revision change after advice. Its source is authored notes on standard theory, not imported game statistics or engine analysis. The UI resource is v4; reconnect/refresh tools to load it while retaining the game UUID.

## Replay verification
The widget build now produces a separate replay HTML resource traced into `/mcp` and `/replay`. No additional dependency, account, or service is required. `create_replay` accepts one of gameId, PGN, or moves plus optional initialFen/startPly/durationsMs; only this tool opens a replay view. read_replay, seek_replay, and get_replay_guidance are headless. Replay UUIDs are independent of live game UUIDs and the live game's state is never advanced by replay controls.

Verify a current-game snapshot, PGN import, and a FEN continuation starting with Black on move 42. Check that a later starting ply renders the correct frame, previous/next and slider work, autoplay obeys speed/timing mode, pause/review shares the selected position, and a model seek pauses the viewer. Check promotion, castling, and en passant. Confirm the active game UUID/revision remains unchanged.

Elapsed timings are read from explicit arrays, app ledger, or PGN %emt; %clk balances alone are not elapsed times. Supplied historical metadata remains unverified. The browser import harness is `/replay`; it uses `/api/replay` independently of the MCP route's cache. Both are best-effort instance-local memory. A lost server record requires re-import for remote synchronization, while the loaded sequence remains navigable locally.

## Instance scaling and cache recovery
The current Next.js Vercel Functions configuration does not guarantee a single persistent process. Vercel's maxConcurrency property is a limit per function instance, not a project-wide instance count. Setting it to 1 is not a solution to shared app memory. The current CLI source also rejects top-level functions affinity configuration outside Services; no unverified affinity or single-instance setting has been added here. See Vercel's packages/config/src/types.ts and packages/cli/src/util/validate-config.ts in the public vercel/vercel repository.

v0.5 includes validated full-history snapshots on board requests and in model context. A cold instance can reconstruct the same game UUID and known timing. Missing history produces recovery_required instead of a host-aborting tool error. Expired and conflicting histories remain rejected, and identical move retries return the committed result without advancing or charging clocks twice.

Snapshots do not deliver an unseen opponent reply from another instance. The board can legally reconcile an explicitly announced SAN move through Apply announced move, but guaranteed shared delivery requires durable shared state or a persistent single-process deployment. A UUID alone, one region, or a concurrency limit does not make memory durable. Test with separate empty caches as well as normal HTTP requests, refresh app tools, and load a v0.5 board.

## Multiplayer v0.6: no additional infrastructure

The publisher reaffirmed memory-only storage and selected staying on Vercel with possible missing games. Do not configure Redis, a database, OAuth, replicas or a new server. Existing GitHub Actions remains the deployment owner. `CHESSBUDDY_PUBLIC_URL` optionally sets the public link origin (defaults to the existing production site).

`/multiplayer` is the web entry; `/api/multiplayer` POST and eight multiplayer MCP tools share a process-global cache in each Node process. Private codes are passed in JSON/tools and private per-game browser/widget state, never query parameters. Joining explicitly claims the public UUID invitation. Only the creator can manage sharing; spectator-link fragments carry a separate read-only code. Codes are hashed in the server record. No account identity or secret recovery is offered.

Local production smoke verifies API-created games can be joined/read/moved through independent MCP clients, and vice versa in the same process. Unit tests cover concurrent claims/commits, idempotency, role boundaries, spectator rotation/revocation, hints without move spoilers, completed-game analysis, clocks and fixed expiration. These tests do not establish cross-instance continuity. Vercel routing can still return GAME_UNAVAILABLE. No memory snapshot is accepted for multiplayer.

In ChatGPT refresh tools, request a multiplayer game, retain your private code, and share only the invitation link/UUID. In a second conversation accept the invitation. Play both humans' turns and verify polling, UUID/revisions and private coaching modes. Watch with the spectator link in a browser and a third conversation; revoke it and confirm reads fail. Finish a game (e.g. the short f3/e5/g4/Qh4# test line) and review earlier plies without changing the final record. Review and all access end at the creation deadline or earlier memory loss.
