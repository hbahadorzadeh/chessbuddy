## Why
Friends want to play each other in separate ChatGPT conversations with private coaching, and let others watch and understand the same game. Instance-local solo caches cannot synchronize these users reliably.

## What Changes
- Add two-human games with random private player codes, public invitation UUIDs/links, atomic seat acceptance, and server-authorized turns.
- Add creator-managed revocable invitation and spectator access, live spectator explanations, and completed-game replay without a shared live pause cursor.
- Give each player an independent explanations/hints/suggestions preference.
- Use one process-global memory store and polling in the existing Next.js app, with fixed seven-day expiration from creation.
- Support both the browser app and ChatGPT tools, preserving solo games and their existing cache behavior.

## Capabilities
### New Capabilities
- `multiplayer`: Shared games, bearer seats, spectators, coaching and expiry.

### Modified Capabilities
None. Solo prototypes remain separate.

## Impact
No external storage, new package, account service, engine or WebSocket service. One continuously running Node process is required for reliable cross-user synchronization until restart. Privacy notices must describe shared storage, private codes and spectator links. Deployment and in-host acceptance require an actual single-process deployment and two ChatGPT sessions.
