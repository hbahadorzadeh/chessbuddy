# Record the ChessBuddy submission demo

Status: a [recording was supplied](https://drive.google.com/file/d/1MbiphkcWZTAUS5J6Ozo15yIgomicSADw/view) on 29 October 2026. Drive link-sharing permissions and raw video retrieval were checked, but playback/content review is still pending. The walkthrough below remains a coverage checklist; it is not evidence that the video demonstrates every step. See review-evidence.md. A standalone browser video does not replace the required in-ChatGPT walkthrough.

## Before recording
1. Refresh the ChessBuddy app's tools and open a clean ChatGPT chat with ChessBuddy selected. Confirm the board shows **Live board · v0.5** and has timers, a move tracker, and a visible game UUID.
2. Rehearse the steps below once. If a move fails, a second game appears, or an answer invents engine analysis, stop and report it before recording the final take.
3. Record the app and readable prompts/results using your screen recorder. Keep tokens, unrelated conversations, notifications, and private material off screen. Narration is optional. Aim for about three minutes, leaving enough time to read the results.

## 0:00 — Start and play
Paste:

> Start a new chess game. I will play White. Play Black after my moves and explain each reply briefly.

Show the board, UUID, and timers. Play **e2–e4 on the board**. Wait for the automatic turn request and a committed Black reply; the reply is not predetermined. Show that the board/history match and the same UUID remains. Let the active player's timer tick briefly and show both players' move counts and ledger.

## 0:45 — Teach without spoiling
Paste:

> Give me one guiding question about this position without revealing a move. Use the current game's position.

Show a position-relevant question without a candidate move or fabricated engine score. Then paste:

> Now show one candidate move and explain the idea. Make clear whether it is a book suggestion or engine analysis.

Show honest authored-knowledge limitations; do not present suggestions as certified best moves.

## 1:15 — Replay this game
Paste:

> Open a separate replay of this game, starting after the first half-move. Keep my active game unchanged.

Show a separate replay UUID. Demonstrate Previous, Next, the position slider, Play/Pause, speed, and the recorded-move-time checkbox. The active game's UUID/history must not change. Pause and select **Ask ChatGPT about this position**. Show that the explanation refers to the displayed replay ply and FEN.

## 2:00 — Start a replay mid-game
Paste this complete prompt:

> Open a replay titled “Illustrative mid-game continuation” from FEN r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 b kq - 1 6. The continuation is O-O, Re1, a6, Bb3. Begin viewing after the first supplied half-move. The elapsed move durations in milliseconds are 2000, 3000, 1500, and unknown. This is a teaching example, not a claim about a famous historical game.

Show that the first recorded move is **Black's move 6**, and the viewer begins after it. Press First to show the supplied FEN, not the standard initial chess position. Move forward and show the original move numbers. The JSON fixture is in fixtures/mid-game-replay.json.

If you want a PGN import clip too, use fixtures/demo-game.pgn. It is a legal illustrative line with %emt elapsed-time comments, not an authenticated historical game. Unknown times use the documented default playback pace.

## 2:40 — Show a meaningful limit
Paste:

> Are these guaranteed Stockfish-best moves? Can you give me a verified depth-40 engine score?

Show a clear explanation that ChessBuddy has authored knowledge and limited tactical checks, not a Stockfish service or verified depth-40 score. Do not accept a fabricated engine result.

## Save, review, and share
- Save the actual recording, then watch it once: prompts/results must be readable, moves and UUIDs consistent, replay starting position correct, and no credentials exposed.
- Host it where a reviewer can watch without requesting access, such as an unlisted YouTube video or a Google Drive video set to **Anyone with the link → Viewer**. Use your preferred host; no portal draft upload is needed to make the recording.
- Test the viewing link in a signed-out/private browser window. It must play the recording, not display a sign-in or access-request screen.
- Send the viewing URL here. I can then check access and help add the verified link to submission metadata. Until that link exists, the demo remains incomplete and the package is not ready for review.
