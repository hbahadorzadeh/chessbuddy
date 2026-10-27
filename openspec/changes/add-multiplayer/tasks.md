## 1. Definition
- [x] 1.1 Define lightweight bearer-seat access, process-shared app memory, independent coaching, spectators, completed-game review and fixed expiration.

## 2. Implementation
- [x] 2.1 Add bounded process-global atomic create/CAS memory storage shared by API and MCP, without external services.
- [x] 2.2 Implement seat acceptance, move validation/idempotency, code hashes and revocable sharing.
- [x] 2.3 Add independent coaching and access-checked completed-game position guidance.
- [x] 2.4 Expose browser and MCP flows with same-view polling, private code handling, clocks and ledger.
- [x] 2.5 Update setup, policy and release documentation.

## 3. Verification and delivery
- [x] 3.1 Test concurrent claims/moves, retries, permission boundaries, same-process API/MCP state, expiry and coaching/replay isolation.
- [x] 3.2 Run strict OpenSpec, types, lint, tests, production build and HTTP smoke.
- [x] 3.3 Verify API/MCP share state on one process and disclose best-effort Vercel limitations (publisher chose to keep Vercel, no external service).
- [ ] 3.4 Deploy and verify live API/tools/resources without regressing solo mode.
- [ ] 3.5 Verify invitation acceptance, private coaching and spectator updates in two separate ChatGPT conversations and a browser.
