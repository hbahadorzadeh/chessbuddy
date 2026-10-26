# Public submission preparation — incomplete draft

This is preparation material, not an uploaded package, submitted app, or approved release. No public-submission legal attestations have been made. The listing JSON intentionally omits unknown publisher facts and URLs; it is not a final plugin manifest or submission-ready ZIP.

## Confirm next
- Publisher selected: Hamed Bahadorzadeh; portal identity verification remains unverified.
- Targeting confirmed: all available countries (countries: []).
- Commerce confirmed for this release: free; no purchases.

## Drafted
- Listing name: ChessBuddy; subtitle: Learn chess by playing; category: Education & Research.
- English long description and three example prompts in listing-draft.json.
- Review cases and walkthrough below based on implemented source.
- Technical data inventory separating known behavior from unknown policy decisions.

## Still needed before packaging/submission
- Publisher must complete portal identity verification; selected name/country/free declarations are recorded.
- Public support contact confirmed: h.bahadorzadeh@gmail.com. Support page implemented; short policy pages are implemented at /privacy and /terms for this deployment.
- Verify the four public listing URLs after deployment: homepage, /support, /privacy, and /terms. All four values are present in listing-draft.json; successful deployment and public content checks are still required.
- Actual square icon files: listing logo at least 256 × 256 and composer icon at least 48 × 48, PNG up to 5 MiB. Proposed direction: a simple green knight and one light board square, without small text. Dark-mode assets/colors are optional.
- Real recorded demonstration in ChatGPT of the version being submitted, hosted at a reviewer-accessible URL and verified by playback. The walkthrough is a script, not a recording.
- In-host test evidence for five positive and three negative review cases. Automated domain/MCP/HTTP checks do not establish model tool choice or host rendering behavior.
- Final portable manifest/server configuration and inspected ZIP after missing facts/materials are supplied. No package is currently claimed ready.
- Developer/domain verification, applicable platform scans, and publisher-completed legal/policy attestations in the intended submission account.

## Reviewer access
The implementation currently exposes the HTTPS MCP endpoint without account login: https://chessbuddy-self.vercel.app/mcp. No reviewer account is currently required. Recheck availability and deployment protection before submission; do not place secrets in listing or ZIP fields. Vercel best-effort memory may require a fresh test game after instance loss.

## Short real-demo walkthrough to record
1. Connect the development app in ChatGPT and show the release label and new game UUID.
2. Play e4 on the board; show the automatic opponent request and a committed reply updating the same game. Show unchanged UUID, clocks, and two ledger entries.
3. Ask for a question-level hint; show no revealed move, then explicitly ask to see a suggested move and its limitations.
4. Ask to replay that game at a later ply; demonstrate previous/next, jump, play/pause, recorded-time mode, and Ask ChatGPT about this position.
5. Import a PGN or FEN continuation beginning mid-game; show correct side to move and original move numbering. Show active game unchanged.
6. Ask for a guaranteed engine-best move and show an honest limitation rather than a fabricated engine claim.

Rehearse in the actual intended ChatGPT browser first. Record with your screen recorder if no recording tool is available; avoid tokens, unrelated chats, or private data. Host the saved video with reviewer access and verify playback before adding its real URL to submission metadata. Portal draft upload is a later step, not a prerequisite for recording.
