## ADDED Requirements
### Requirement: Simple player access and invitations
The app SHALL create a stable game UUID and independent random player bearer codes, store only code hashes, and accept the first invitation claim atomically. It SHALL support invitations via browser and ChatGPT without placing player codes in public URLs.

#### Scenario: Two recipients accept concurrently
- **WHEN** two recipients attempt to accept the same open invitation
- **THEN** exactly one claims the other color and receives a private code; the other receives an invitation-closed result

#### Scenario: Creator revokes invitation
- **WHEN** the creator disables an unclaimed invitation
- **THEN** joining fails until it is explicitly enabled again; an already claimed seat is never reassigned

### Requirement: Shared authoritative moves
The app SHALL validate both humans' moves against one shared history, seat, revision and idempotency request UUID. Neither a spectator code nor a game UUID alone SHALL authorize moves or sharing changes.

#### Scenario: Retry after lost response
- **WHEN** the same player repeats a successful request UUID with identical revision and move
- **THEN** the committed state is returned without a duplicate move or clock charge, while conflicting reuse fails

#### Scenario: Browser and MCP use the same server
- **WHEN** browser and ChatGPT requests reach the same continuously running Node process
- **THEN** they read the same in-memory game and commit only legal moves on the authenticated player’s turn at the expected revision

#### Scenario: Restart or another instance
- **WHEN** a request reaches a process that does not contain this game
- **THEN** it returns unavailable and does not fabricate history or promise cross-instance continuity

### Requirement: Revocable spectators
The creator SHALL be able to create, replace and revoke a separate read-only spectator link. Spectators SHALL see live positions and explanations, without player codes or coaching preferences of either player.

#### Scenario: Old spectator link after replacement
- **WHEN** the creator replaces or revokes spectator access
- **THEN** old spectator credentials fail on subsequent reads, coaching and mutation attempts

### Requirement: Private coaching preferences
Each player SHALL independently select explanations, hints or suggestions. Server guidance SHALL omit next-move candidates in explanations/hints modes. ChatGPT SHALL be instructed to coach the authenticated user rather than play the other human.

#### Scenario: Spectator requests advice
- **WHEN** a spectator requests guidance
- **THEN** explanations are returned with no explicit next-move candidates and no state mutation

### Requirement: Completed-game analysis
A viewer with valid access SHALL be able to review a completed game by UUID at any legal ply without changing shared game state or another viewer's position.

#### Scenario: Active game replay request
- **WHEN** a viewer asks to rewind an active game through replay guidance
- **THEN** the request is rejected and live shared history is preserved

### Requirement: Fixed seven-day retention
Shared games SHALL expose a seven-day deadline from creation, use memory cleanup and service-side checks, and never extend that deadline through reading, joining, moving or sharing. The app SHALL disclose that restart or routing to another instance can remove access sooner.

#### Scenario: Deadline reached
- **WHEN** any game operation occurs at or after expiration
- **THEN** it returns unavailable and does not recreate the game from user snapshots
