# Public submission preparation — incomplete draft

This is preparation material, not an uploaded package, submitted app, or approved release. No public-submission legal attestations have been made. The listing JSON includes confirmed publisher details and verified public website URLs; it is not a final plugin manifest or submission-ready ZIP.

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
- Public listing URLs verified: homepage, /support, /privacy, and /terms. All four values are present in listing-draft.json. Production deployment and unauthenticated public-content checks passed on 26 October 2026.
- Icon created and checked: assets/chessbuddy-icon.png, opaque RGB PNG, 1254 × 1254, 1,157,615 bytes. Used for both logo and composerIcon; creator selected one icon for both themes. Generated preview shown for feedback.
- Demo recording supplied: [Drive video](https://drive.google.com/file/d/1MbiphkcWZTAUS5J6Ozo15yIgomicSADw/view). Anyone-with-link Viewer permission and raw video retrieval were confirmed on 29 October 2026. Playback, readability, feature coverage and exposed-code checks remain blocked by the unavailable execution workspace. See review-evidence.md; this is not verified demo evidence yet.
- In-host test evidence for five positive and three negative review cases. Automated domain/MCP/HTTP checks do not establish model tool choice or host rendering behavior.
- Update the listing and cases for the v0.6 multiplayer release, then finalize portable manifest/server configuration and inspect the ZIP. No package is currently claimed ready.
- Dependency-audit findings reported by CI still need applicability/fix triage before a public-ready claim.
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
