## Why
Players who know the rules need help recognizing threats, choosing plans, and learning from mistakes while playing. ChessBuddy brings a playable board and position-aware coaching into ChatGPT, so learning happens in the same conversation as the game.

## What Changes
- Define a Next.js and TypeScript application hosted on Vercel, exposing an MCP server and an embedded chessboard for ChatGPT.
- Support human versus engine games, legal board and conversational moves, progressive hints, explanations, and a three-moment game review.
- Persist games outside serverless process memory with authenticated ownership, revision checks, and idempotent mutations.
- Define bounded Stockfish analysis and explicit failure recovery.
- Supply GitHub Actions for specification checks, application checks, and Vercel deployment once the application scaffold is present.

## Capabilities
### New Capabilities
- `chatgpt-interface`: Interactive board and MCP tool contract inside ChatGPT.
- `chess-game`: Authoritative legal games and configurable engine opponent.
- `chess-coaching`: Progressive hints, grounded explanations, and post-game review.
- `game-persistence`: Owned games, concurrency, and reliable recovery.
- `game-replay`: Separate replay from PGN, game history, or arbitrary initial FEN, with timed playback and position-aware review.
- `delivery`: Next.js architecture, verification, and Vercel deployment.

### Modified Capabilities
None; this is a new project.

## Impact
New Next.js repository, MCP integration, persistent database, engine runtime, GitHub Actions, and Vercel project. No standalone chat frontend or OpenAI API key is required for host-provided conversation. Account linking, engine packaging, and embedded-board compatibility require early integration validation. This proposal does not claim an installed ChatGPT app or deployed service.
