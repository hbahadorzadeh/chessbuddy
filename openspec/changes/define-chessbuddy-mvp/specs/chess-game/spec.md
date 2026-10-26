## ADDED Requirements

### Requirement: Legal complete chess games
The system SHALL use a chess rules library to validate moves and determine check, checkmate, stalemate, insufficient material, and supported claimable or automatic repetition and move-count draws according to documented standard rules.

#### Scenario: Illegal move
- **WHEN** a move leaves the moving side in check
- **THEN** the server returns INVALID_MOVE without changing revision or history

#### Scenario: Special move
- **WHEN** a player makes a legal castle, en passant capture, or underpromotion
- **THEN** the resulting FEN and SAN history reflect the standard move correctly

#### Scenario: Terminal position
- **WHEN** a move ends the game
- **THEN** the server records the result and rejects further moves

#### Scenario: Repetition
- **WHEN** the history reaches a standard draw condition
- **THEN** the service uses full history to expose a claim or finish automatically as required by that rule

### Requirement: Engine opponent
The system SHALL allow player color and beginner/friendly/challenging difficulty presets, validate every engine move, and bound engine computation.

#### Scenario: Choose sides
- **WHEN** the player selects Black
- **THEN** the engine supplies a validated opening move before accepting a human move

#### Scenario: Engine timeout
- **WHEN** analysis times out after the human move was committed
- **THEN** the human move remains stored, the board shows a pending opponent turn, and retry can complete that turn once

#### Scenario: Invalid engine reply
- **WHEN** an engine result contains an illegal move or belongs to a different revision
- **THEN** the server discards it and exposes a recoverable failure without mutating the game

### Requirement: Elapsed timers and per-player move tracking
Each game UUID SHALL expose an elapsed game clock, thinking-time and move totals for each player, and a per-ply move/duration ledger. Clocks SHALL advance for the active side until a legal move commits and SHALL stop at game end. They SHALL measure elapsed time, not enforce countdown time controls.

#### Scenario: Alternating moves
- **WHEN** White and Black commit moves after different elapsed intervals
- **THEN** each interval is attributed to the correct player and move, and both move counters reflect the committed history

#### Scenario: Illegal or duplicate move
- **WHEN** a move fails legality or revision checks
- **THEN** no duration is committed and the active side's clock continues

#### Scenario: Game ends
- **WHEN** a move ends the game
- **THEN** the game/player timers freeze at that move's commit timestamp

#### Scenario: Recovery
- **WHEN** a same-UUID game is recovered with valid timing metadata
- **THEN** recorded times are retained; missing historical times are marked unknown instead of fabricated
