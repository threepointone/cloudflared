# cloudflared (TypeScript scaffold)

This directory contains a minimal TypeScript scaffold that re-implements the `hello` test server from the Go codebase with equivalent endpoints over HTTPS using a built-in development certificate.

## Scripts

- `pnpm dev` (or `npm run dev`): run the TLS hello server in watch mode
- `pnpm build`: build to `dist/`
- `pnpm start`: run built CLI
- `pnpm test`: run tests via Vitest

## Usage

- Start the server:

```bash
pnpm i
pnpm dev
```

The server binds to `ADDRESS` env (default `localhost:` which auto-selects a port). It exposes:
- `/uptime`
- `/ws` (websocket echo)
- `/sse?freq=10s`
- `/_health`
- `/` (HTML request echo)
