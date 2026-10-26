# GitHub Actions and Vercel

The workflow is present, but this is a specification repository. It validates the OpenSpec change and skips app build/deployment until a root package.json exists. It does not claim to build a Next.js app before that app is implemented.

## Application prerequisites
1. Scaffold Next.js App Router and TypeScript at repository root using Node 22 and npm. Commit package-lock.json. Use current supported dependency versions and pin the Vercel CLI and OpenSpec CLI as devDependencies.
2. Provide scripts `typecheck`, `lint`, `test`, and `build`. Tests must cover meaningful chess, ownership, concurrency, and recovery behavior. Required scripts intentionally do not use `--if-present`.
3. Replace the bootstrap OpenSpec npx installation with the locked local CLI after npm ci. Continue validating active changes as change names evolve; after archival, validate canonical specs instead of the archived change name.
4. Make the generic Next.js build run without production credentials. Validate required runtime configuration at request time or in deployment validation, rather than contacting a production database during builds.

## One-time hosting setup
1. Create production and preview Vercel projects, both configured for Next.js, repository root, and Node 22. Use different project IDs and isolated databases/OAuth settings. Disable Vercel's automatic Git deployments if GitHub Actions owns deployment.
2. In GitHub, create environments named `production` and `preview`. Add environment secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` in each. Use a token scoped to the required Vercel projects. Do not send secrets through chat or commit them.
3. Restrict production to main. Configure preview environment approval according to collaborator trust because same-repository PR code can execute with preview secrets. Fork PRs never deploy; the workflow uses pull_request, not pull_request_target.
4. In the corresponding Vercel environments, configure database URL, verified OAuth issuer/audience and credentials, stable app origin, and engine worker credentials if the spike selects a worker. Confirm actual variable names during implementation. Keep server credentials out of NEXT_PUBLIC variables and widget resources.
5. Give ChatGPT a stable production MCP URL (planned `/mcp`) and configure OAuth/resource metadata using the supported ChatGPT developer connection flow. Verify account access and embedded-board rendering. Vercel deployment alone does not complete this connection.

## Workflow behavior
- All main pushes and PRs targeting main: strict OpenSpec validation; when scaffold exists, npm ci, typecheck, lint, tests, Next.js build.
- Main after passing checks: pull production Vercel settings, Vercel production build, deploy prebuilt output.
- Same-repository PR after passing checks: pull preview settings from the separate preview project, build, deploy prebuilt output.
- Fork PR: checks only; no deployment job or deployment secrets.
- Manual dispatch: production deployment only on main and after checks.
- Failed checks prevent deploy. Missing secrets fail before the Vercel CLI runs. Deployment URLs appear in the job summary and environment.

The deploy job repeats the build with Vercel's settings to produce the platform-specific output. No artifact is rebuilt after `vercel build` before `vercel deploy --prebuilt`.

## Verification and rollback
After first deployment, verify MCP initialization, authenticated tool access, board resource CSP, a legal move, state persistence across requests, and timeout recovery inside ChatGPT. Measure engine cold/warm latency within the selected Vercel execution limit.

Record the last healthy production deployment. Roll back by promoting that deployment in Vercel and verify the stable MCP URL and a saved game. Use backward-compatible expand/contract migrations; a deployment rollback does not automatically undo database migrations. Do not run production migrations from untrusted preview code.

## Authoring limitations
The authoring environment could not reach its configured HTTP proxy, so official OpenSpec CLI validation, dependency installation, Next.js build, GitHub Actions execution, and Vercel deployment were not run. The connected GitHub tools do not expose repository creation; the repository must exist before connector publication.
