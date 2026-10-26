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
No database or new credentials are required. A module-level cache holds at most 1,000 games per warm process, expiring one hour after the last move. Each game uses a UUID created once by `new_game`. All other tools require that same UUID. Reopening is read-only; recovery restores the same UUID. UUIDs are anonymous identifiers, not account authentication; do not post active game IDs publicly.

Vercel may route requests to separate instances or discard process memory. This is explicitly best-effort and does not implement durable saved games. Revision checks are atomic only within one process. Browser storage and supported host widget state retain the visible history per UUID; those can be unavailable in sandboxed views. Recovery refuses to overwrite newer/conflicting server history and cannot recover an unseen reply from another instance.

After deployment refresh app tools and open a **new_game** once. Verify **Live board · v0.3** and copy its UUID. Play e4 and have ChatGPT commit c5; verify the UUID stays unchanged, history is e4/c5, and revision is 2. Reopen using open_practice_board with that UUID; it must resume, not reset. A second explicitly new game must receive a different UUID. When testing memory loss, use recover_practice_board with the existing UUID, complete moves, and matching expectedRevision, then reopen the same UUID.

An HTTP smoke test verifies a running server and session identity; ChatGPT panel lifetime and browser turn handoff must still be tested inside the host. The application cannot prevent the host from closing its view, but reopening by UUID must not create a new game.
