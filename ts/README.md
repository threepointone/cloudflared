# cloudflared-ts

TypeScript scaffold for a `cloudflared` rewrite. This is an incremental port aimed at parity over time.

## Prerequisites

- Node.js >= 18

## Install

```bash
cd ts
npm install
```

## Build

```bash
npm run build
```

## CLI Usage

```bash
# Hello
npx cloudflared-ts hello

# Version
npx cloudflared-ts version

# Validate config (YAML)
npx cloudflared-ts config validate ./config.yaml

# List tunnels (requires env vars)
export CLOUDFLARE_API_TOKEN=... 
export CLOUDFLARE_ACCOUNT_ID=...
npx cloudflared-ts tunnel list
```

## Environment

- CLOUDFLARE_API_TOKEN: API token with necessary permissions
- CLOUDFLARE_ACCOUNT_ID: Your account ID (optional if passed in flags later)

## Structure

- `src/logger`: leveled logging via pino
- `src/config`: YAML config load + basic validation
- `src/cfapi`: Cloudflare API client (token auth)
- `src/cli`: CLI entry
