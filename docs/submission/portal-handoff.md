# ChessBuddy v0.6 portal handoff

Publisher: Hamed Bahadorzadeh. Free, no purchases. All supported countries (explicit countries: []). Category: Education & Research.

## Package
Download the chessbuddy-submission artifact from the preparation workflow. Extract its outer GitHub artifact ZIP and upload the inner chessbuddy-0.6.0-submission.zip. That inner ZIP contains only plugin.json, mcp.json and assets/chessbuddy-icon.png. Do not upload the repository source ZIP or include private app bindings. Inspect validation-report.json and archive-contents.txt alongside it.

The video was reviewed and approved by the publisher; assistant playback is unverified. Five positive and three negative review cases are included, not claimed as run. Commerce is described truthfully in the listing; if the live portal asks its commerce question, choose no purchases. No unknown commerce enum or legal acceptance is guessed in the manifest.

## Portal steps
1. Open OpenAI's official developer submission portal from the current plugin/app publishing documentation. Use the account owning the existing ChessBuddy app. Select verified Hamed Bahadorzadeh; complete identity/domain verification if requested. Reuse an existing draft if there is one; do not duplicate ChessBuddy's app or change its endpoint.
2. Upload the inner ZIP as a draft. Verify imported name/version, publisher, icon, description, four URLs, all-country targeting, release notes, demo and 5/3 cases.
3. Connect the existing remote HTTPS MCP endpoint https://chessbuddy-self.vercel.app/mcp with no account authentication. Per-game bearer codes are an application feature, not OAuth credentials. Preserve Portal-generated bindings; never copy them into the portable public upload.
4. For reviewer access, state no account registration is required. Reviewers create fresh temporary games and keep their generated codes private. Provide any secure access fields in the portal, never in the public ZIP.
5. Run cases against this saved draft, inspect exact tool calls and rendered results, and resolve failed/blocked cases and required scans. Do not attest that best-effort Vercel memory is reliable shared/durable storage.
6. The publisher personally completes the live portal's legal/policy declarations. Do not check unverifiable declarations merely because code was prepared. Submit only after required fields/checks pass. Uploading is not submitting, and approval is not publishing; publishing is a separate later action.

The available session tools cannot operate the public submission portal. This file is a handoff, not evidence of upload or review approval.

The portable MCP schema currently rejects optional server extensions. Since this endpoint needs no account authentication, mcp.json uses only the standard type and URL fields, with no credentials or authentication override. Select no authentication in the portal if prompted.
