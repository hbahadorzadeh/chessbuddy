## ADDED Requirements

### Requirement: Durable owned games
The system SHALL persist authoritative games in durable storage and enforce verified authenticated ownership on every read, mutation, hint, and review.

#### Scenario: Resume later
- **WHEN** an authenticated player returns after a server restart
- **THEN** get_game returns the saved game and pending-turn status

#### Scenario: Different owner
- **WHEN** a caller supplies another player’s game ID
- **THEN** the server returns NOT_FOUND and discloses no game state

#### Scenario: Invalid token
- **WHEN** a caller presents an expired token or invalid issuer/audience
- **THEN** the service rejects access before reading game data

### Requirement: Revision and idempotency protection
The system SHALL use transactional revision checks and request identifiers for mutations, including engine completion.

#### Scenario: Repeated request
- **WHEN** the same mutation with the same request ID and payload is retried
- **THEN** the original outcome is returned without applying another move

#### Scenario: Request ID reuse
- **WHEN** a request ID is reused with a different payload
- **THEN** the server rejects the request without mutation

#### Scenario: Concurrent moves
- **WHEN** two commands target the same revision
- **THEN** only one commits and the other receives REVISION_CONFLICT

#### Scenario: Interrupted opponent turn
- **WHEN** the human move committed but the process stopped before the engine reply
- **THEN** a later retry resumes the pending turn and at most one engine reply commits

### Requirement: Seven-day prototype retention target
Anonymous game records and browser snapshots SHALL expire seven days after the last committed move. Reads SHALL NOT extend expiry. This setting SHALL be documented as best-effort under the user's Vercel app-memory choice; process loss or bounded-cache eviction can remove records sooner.

#### Scenario: Retention boundary
- **WHEN** seven days pass since the last committed move
- **THEN** the cache no longer serves that record and an expired browser snapshot is not restored

#### Scenario: Activity and reads
- **WHEN** a move commits and subsequent position/guidance reads occur
- **THEN** the move establishes the new expiry and reads preserve that deadline

### Requirement: Recoverable cache misses with supplied snapshots
The prototype SHALL accept a complete same-game snapshot on game reads, guidance, moves, resume, and game-based replay. It SHALL validate history, identity, timing, expiry, and existing-history compatibility before reconstructing state. A missing cache entry without history SHALL produce a recoverable result rather than a host-aborting tool error.

#### Scenario: Requests reach cold instances
- **WHEN** successive requests reach different empty caches with the latest accepted snapshot
- **THEN** each reconstructs the same UUID/history and can continue without an external store

#### Scenario: Missing history
- **WHEN** only a UUID is supplied and the current instance has no record
- **THEN** the tool returns recovery_required and asks for known history without inventing an initial position or creating a new game

#### Scenario: Conflicting or expired snapshot
- **WHEN** a snapshot belongs to another UUID, conflicts with existing history, or is expired for a missing game
- **THEN** it is rejected without overwriting or reviving that record

#### Scenario: Identical move retry
- **WHEN** the same move/revision is retried after committing
- **THEN** the original committed position/timing is returned without another move or clock charge

#### Scenario: Unseen reply on another instance
- **WHEN** ChatGPT announces a reply that polling cannot find in the local instance
- **THEN** the board preserves its position and offers explicit legal reconciliation, without claiming snapshots provide shared cross-instance memory
