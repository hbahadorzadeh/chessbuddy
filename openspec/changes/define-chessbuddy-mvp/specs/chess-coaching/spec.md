## ADDED Requirements

### Requirement: Progressive hints
The system SHALL provide three requested hint levels: a guiding question, a tactical or strategic theme, and an explicit candidate move. Coaching mode SHALL default to on-request and support a user-selected key-moments mode.

#### Scenario: Gentle hint
- **WHEN** the player asks for a hint without revealing a move
- **THEN** the response gives a position-relevant question without naming the best move

#### Scenario: Reveal move
- **WHEN** the player explicitly requests the final hint level
- **THEN** the response may show a legal engine-backed candidate and why it helps

#### Scenario: No request
- **WHEN** the player plays in on-request mode
- **THEN** the system does not interrupt each turn with coaching or best-move spoilers

### Requirement: Grounded explanations
The system SHALL attach analysis to the exact FEN and revision and separate verified legal variations from teaching suggestions. Missing engine analysis SHALL be disclosed without inventing evaluations.

#### Scenario: Ask about a threat
- **WHEN** the player asks what the opponent threatens
- **THEN** ChatGPT receives current position facts and verified lines where available to explain threats in plain language

#### Scenario: Unavailable analysis
- **WHEN** the engine is unavailable
- **THEN** the response states that analysis is unavailable and offers retry while preserving the game

#### Scenario: Old analysis
- **WHEN** the game revision changes while analysis is running
- **THEN** the result is labeled historical or discarded and is never presented as current

### Requirement: Focused post-game review
The system SHALL review a finished game with up to three meaningful moments and one next practice goal, including replayable positions and legal alternatives where analysis is available.

#### Scenario: Completed game
- **WHEN** the player requests review after a game
- **THEN** the result contains up to three moments with move numbers, position references, plain-language lessons, and one practice goal

#### Scenario: Long review
- **WHEN** review exceeds a request time budget
- **THEN** the system returns a persisted job identifier and subsequent polling retrieves progress or results

#### Scenario: Insufficient moments
- **WHEN** a very short game contains fewer than three useful moments
- **THEN** the review returns fewer moments without fabricating mistakes
