## ADDED Requirements

### Requirement: Separate immutable replay recording
The app SHALL create a replay with its own UUID from exactly one source: a current game snapshot, supplied PGN main line, or supplied SAN/UCI moves. Importing, seeking, playing back, and reviewing a replay SHALL NOT modify an active game. Supplied historical metadata SHALL NOT be represented as independently authenticated.

#### Scenario: Replay current game
- **WHEN** a replay is created from an active game's UUID
- **THEN** it copies the known moves and available per-move durations under a separate replay UUID without changing the active game's revision or position

#### Scenario: Famous-game PGN
- **WHEN** a supplied PGN contains player and event headers
- **THEN** its legal main line is replayable and the UI identifies its metadata as supplied rather than verified

### Requirement: Arbitrary initial position and viewing start
The app SHALL accept a legal starting FEN, including side to move, castling/en-passant state, and move number, and SHALL validate every continuation move against it. It SHALL also accept an initial viewing ply relative to that FEN. Ply zero SHALL mean the supplied initial position, not necessarily the standard start of a chess game.

#### Scenario: Mid-game continuation
- **WHEN** a continuation starts from a FEN with Black to move on move 42
- **THEN** the first replay move is shown as Black's move 42 and subsequent frames preserve correct move numbering and positions

#### Scenario: PGN setup position
- **WHEN** PGN SetUp/FEN headers specify a nonstandard start
- **THEN** the replay uses that position and rejects a conflicting explicitly supplied initial FEN

#### Scenario: Invalid sequence or start index
- **WHEN** moves are illegal from the initial FEN or the viewing ply exceeds the sequence
- **THEN** import fails clearly without creating a partial replay or modifying an active game

### Requirement: Replay controls and timing
The viewer SHALL provide first/previous/next/last, jump to position, autoplay/pause, and speed controls. Recorded elapsed per-move durations SHALL be optional. Playback SHALL use them when enabled and use an explicit default pace for unknown timings. PGN remaining-clock comments SHALL NOT be treated as elapsed time without sufficient conversion information.

#### Scenario: Recorded and missing timing
- **WHEN** a replay has a mix of elapsed durations and unknown durations
- **THEN** recorded-time playback uses known durations divided by speed and a documented default for missing values, with a minimum visual frame interval

#### Scenario: Timing import
- **WHEN** PGN contains valid %emt elapsed comments or an aligned durationsMs array is supplied
- **THEN** those times appear on matching moves; %clk balances alone remain unknown elapsed times

### Requirement: Position-aware replay teaching and shared cursor
ChatGPT and the user SHALL be able to seek the existing replay without rendering replacement boards. Replay guidance SHALL use the actual initial FEN and selected ply, including previous-position facts where available. Autoplay SHALL publish the locally viewed ply; review requests SHALL identify that exact ply. A paused cursor SHALL be synchronized to the server with revision checks.

#### Scenario: Review a later position
- **WHEN** the player pauses at a later ply and asks ChatGPT to explain
- **THEN** the request references that replay UUID, ply, and position rather than assuming the game began at the standard opening position

#### Scenario: Model seeks
- **WHEN** ChatGPT seeks the current replay using its latest revision
- **THEN** the mounted viewer observes the new cursor and pauses local autoplay without affecting the active game

#### Scenario: App-memory loss
- **WHEN** Vercel loses the replay's server record
- **THEN** the loaded local sequence remains navigable, synchronization failure is disclosed, and the original source can be re-imported
