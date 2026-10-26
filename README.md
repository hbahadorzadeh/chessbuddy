# ChessBuddy
Learn chess by playing inside ChatGPT, with an interactive board and a coach you can ask for help.

**Status: specification phase.** The Next.js app, engine integration, database, and ChatGPT connection are planned, not implemented. The repository contains an OpenSpec change and a GitHub Actions deployment foundation. No service has been deployed.

## Review the project
- [Proposal](openspec/changes/define-chessbuddy-mvp/proposal.md)
- [Technical design and tool contracts](openspec/changes/define-chessbuddy-mvp/design.md)
- [Five capability specifications](openspec/changes/define-chessbuddy-mvp/specs)
- [Implementation checklist](openspec/changes/define-chessbuddy-mvp/tasks.md)
- [CI and Vercel setup](docs/deployment.md)

The MVP supports a complete game against an adjustable engine, conversational and board moves, progressive hints, explanations, durable game recovery, and a review of up to three learning moments. ChatGPT supplies the conversation; Next.js hosts the MCP tools and board resources on Vercel.

## OpenSpec workflow
Install the official CLI using the [OpenSpec instructions](https://github.com/Fission-AI/OpenSpec#quick-start), then run:

```sh
openspec init --tools codex
openspec validate define-chessbuddy-mvp --strict
openspec status --change define-chessbuddy-mvp
```

The proposal and delta specs were authored directly in OpenSpec format. CLI initialization and official validation have not run in the authoring environment because its network proxy is unreachable. CI will run strict validation. Review the proposal, then implement tasks in order. Keep this change active until acceptance and archive it afterward to populate the canonical specs.

## Planned stack
Next.js App Router, React, TypeScript, MCP/Apps SDK, chess.js, Stockfish through a bounded adapter, managed PostgreSQL, OAuth account linking, GitHub Actions, and Vercel. The first implementation milestone proves the embedded board and engine runtime on Vercel before building the complete game.
