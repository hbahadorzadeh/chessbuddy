# ChessBuddy
Read openspec/config.yaml and the active change under openspec/changes/define-chessbuddy-mvp before implementation. Keep requirements, design, and tasks aligned with changes. This starts as a specification repository; do not claim a playable app or deployed service from the presence of workflow files.

Use Next.js App Router, TypeScript, npm with a committed lockfile, and Node 22. ChatGPT is the primary UI. All move sources share authoritative server validation. Persist owned games outside process memory, protect mutations with revisions and idempotency keys, and preserve human moves across engine failures.

Before implementing the widget, read current OpenAI Apps SDK and https://github.com/openai/mcp-extensions/blob/main/AGENTS.md guidance and verify the actual ChatGPT integration. Run official OpenSpec strict validation and relevant application checks. Archive the change after acceptance; do not mark unverified tasks complete.

The user explicitly selected best-effort app memory on Vercel for anonymous prototype boards and rejected an external store. Preserve this preference. Document instance routing/restart limitations and provide explicit history recovery. Durable authenticated saved games remain a later capability; do not claim this cache fulfills them.

The user explicitly reaffirmed app-memory-only storage for multiplayer, requesting one running instance and no Redis or other external service. Use a process-global map shared by API and MCP routes, atomic per-process mutations, a fixed seven-day deadline and bounded capacity. A single-server deployment can share state until restart; Vercel cannot guarantee one process or continuity. Never claim otherwise. Player codes must never appear in shared URLs.
