## ADDED Requirements

### Requirement: Next.js application architecture
The implementation SHALL use Next.js App Router and TypeScript with a Node.js MCP route, an embedded React board resource, and external durable storage, deployed on Vercel.

#### Scenario: Production build
- **WHEN** the application scaffold and configuration are present
- **THEN** the production Next.js build succeeds without exposing server secrets to client resources

#### Scenario: Runtime spike
- **WHEN** the selected engine is tested on Vercel
- **THEN** the implementation records measured latency and selects a bounded compatible runtime or an external worker before shipping

### Requirement: GitHub checks
GitHub Actions SHALL validate active OpenSpec changes and, after scaffold creation, run locked dependency installation, type checking, lint, tests, and a production build on pull requests and main.

#### Scenario: Spec-only repository
- **WHEN** there is no package.json yet
- **THEN** CI validates the proposal and explicitly skips application build and deployment

#### Scenario: Failed check
- **WHEN** a required application or specification check fails
- **THEN** deployment jobs do not execute

#### Scenario: Locked dependencies
- **WHEN** an application package.json exists without package-lock.json
- **THEN** the application build fails with a clear prerequisite error

### Requirement: Vercel deployment
GitHub Actions SHALL deploy passing main commits to production and eligible same-repository pull requests to a separate preview project using scoped secrets. Fork pull requests SHALL receive checks without deployment secrets.

#### Scenario: Main passes
- **WHEN** a main commit passes required checks and the production environment is configured
- **THEN** the workflow pulls production settings, builds with Vercel, deploys the prebuilt output, and records the URL

#### Scenario: Trusted preview
- **WHEN** a same-repository PR passes checks and preview is configured
- **THEN** the workflow uses the preview project and preview settings to build and deploy a preview

#### Scenario: Fork preview
- **WHEN** a fork opens a PR
- **THEN** checks run and deployment is skipped without exposing deployment credentials

#### Scenario: Missing setup
- **WHEN** deployment secrets are not configured
- **THEN** the deploy job fails clearly before calling Vercel

#### Scenario: Rollback
- **WHEN** a production release is faulty
- **THEN** the operator can promote a previously healthy Vercel deployment and verify the stable MCP endpoint; migrations remain backward-compatible
