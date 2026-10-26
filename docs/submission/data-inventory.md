# Technical data inventory for policy drafting

These are implementation facts, not a published privacy policy or legal commitments.

- Anonymous live-game records: random UUID, SAN history, revisions, elapsed timing metadata. Bounded per-process memory, up to 1,000 games. Seven-day logical expiry from last committed move; reads do not extend it. Instance loss or eviction can remove them sooner.
- Replay records: separate UUID, starting FEN, supplied move history/PGN headers, optional move durations, frame positions, cursor/revision, and optional source game UUID. Up to 100 records per instance; seven-day expiry from import. Supplied PGN headers may contain player names or other user-provided text.
- Browser/host state: per-game legal move history, UUID, timing, and expiry where storage is allowed; current replay cursor in supported host widget state. Expired browser game snapshots are ignored/cleaned on access; no always-running browser deletion guarantee is made.
- Tool arguments/results and current position are sent through the ChatGPT host. The app sends user-initiated turn/review messages and position-context updates. No backend OpenAI API key or separate model API call is implemented.
- No account sign-in, payment system, third-party analytics SDK, or external database is currently implemented. This is code scope, not a publisher commerce declaration.
- UUIDs act as anonymous references; anyone who obtains a live ID may be able to access its record while it is available. The prototype does not provide account ownership or durable private saved games.
- Vercel hosts requests/functions. Exact infrastructure log content, log retention, subprocessors, and account-level analytics settings have not been inspected or confirmed. Those facts must be checked before publishing a privacy policy.

Publisher decisions still needed: contact/support arrangements; handling of deletion requests; intended audience/age policy; actual Vercel logging/configuration; relevant legal jurisdiction/terms; and any additional data collection or commerce planned outside this code. Do not publish a promise of guaranteed seven-day storage or deletion based solely on this cache.
