# ChessBuddy privacy policy — draft for publisher review

Status: unpublished draft. Publisher: Hamed Bahadorzadeh. Contact: h.bahadorzadeh@gmail.com.

## What the app processes
ChessBuddy processes the chess positions, moves, game/replay identifiers, timing data, PGN headers, and other chess inputs you provide. Imported PGN may include player names or other text you choose to include. No ChessBuddy account sign-in or purchase is currently required.

## Purpose and sharing
The app uses this information to validate moves, maintain an anonymous practice session, track elapsed time, replay positions, and provide position-aware teaching material. Tool inputs/results and selected position context pass through ChatGPT. Vercel hosts the application and can process technical request information and logs. These services have their own terms and privacy practices. The application code does not currently include an additional analytics SDK or an external database.

## Storage and retention
Anonymous live games use bounded instance-local server memory with a seven-day logical expiry from the last committed move. Replays expire seven days after import. Records may disappear sooner after instance loss or capacity eviction. This does not guarantee seven days of availability or an always-running physical deletion process.

Where the host/browser permits it, the app stores the game identifier, legal move history, timing, and expiry in browser/host widget state to restore the visible game. Expired snapshots are ignored and cleaned on access. Current replay selection can be saved in host widget state. Clearing browser storage or the relevant ChatGPT app/conversation state can remove those local snapshots, subject to the host's controls.

## Access and requests
Game identifiers are anonymous references, not account authentication. Do not publish active identifiers or upload confidential data. Contact h.bahadorzadeh@gmail.com for privacy questions or requests. Exact request procedures and any response commitments need publisher approval before publication.

## Decisions still required before publication
- Confirm Vercel's actual logging, analytics settings, technical log retention, and applicable service/subprocessor details.
- Confirm the intended audience/age policy and the final privacy request/deletion procedure.
- Approve the wording and a publication/effective date. This draft is not a declaration of legal compliance or an approved public policy.
