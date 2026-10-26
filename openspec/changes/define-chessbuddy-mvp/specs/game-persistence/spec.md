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
