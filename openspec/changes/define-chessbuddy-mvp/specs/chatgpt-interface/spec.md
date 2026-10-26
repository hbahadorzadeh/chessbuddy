## ADDED Requirements

### Requirement: ChatGPT is the primary interface
The system SHALL expose an MCP endpoint and an interactive board resource that can be used inside ChatGPT without a standalone chat frontend.

#### Scenario: Start a game in conversation
- **WHEN** the player asks ChatGPT to start a game
- **THEN** ChatGPT invokes new_game and renders the board with the authoritative initial position

#### Scenario: Host compatibility failure
- **WHEN** the embedded resource cannot render in the target ChatGPT environment
- **THEN** the integration reports the limitation and the embedded-board acceptance criterion remains unmet

### Requirement: Equivalent board and conversational moves
The system SHALL validate board and conversational moves through the same authoritative game service and synchronize accepted state with the host model context.

#### Scenario: Board move
- **WHEN** a player selects e2 and e4 on their turn
- **THEN** the server validates the move and the board and model context receive the resulting revision

#### Scenario: Ambiguous request
- **WHEN** a natural-language request identifies multiple possible legal moves
- **THEN** ChatGPT asks which move is intended and no state changes

#### Scenario: Promotion selection
- **WHEN** a pawn reaches its promotion rank through the board
- **THEN** the player chooses queen, rook, bishop, or knight before the move is committed

### Requirement: Accessible board
The board SHALL support tap and keyboard interaction, square and piece labels, player orientation, move history, and visible turn/check/game-over status.

#### Scenario: Keyboard play
- **WHEN** a keyboard user selects a legal source and destination
- **THEN** they can submit the move and receive an accessible status update

#### Scenario: Stale widget
- **WHEN** the widget submits a move from an old revision
- **THEN** the server rejects the mutation and the widget refreshes authoritative state

### Requirement: Explicit ephemeral integration prototype
The first integration slice SHALL expose stateless practice tools accepting complete move history, validate every move on the server, and label the experience as a prototype without saved games or an engine opponent. The board SHALL use the standard MCP Apps bridge and publish accepted position updates to model context.

#### Scenario: Practice move through a tool
- **WHEN** the current history and a legal SAN or UCI move are submitted
- **THEN** the server returns the reconstructed position, complete SAN history, legal moves, and revision without storing a game

#### Scenario: Context synchronization fails
- **WHEN** a board move succeeds but the host rejects its model-context update
- **THEN** the board keeps the accepted position and tells the player that ChatGPT context did not update
