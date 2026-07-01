# Frontend (Web)

Next.js frontend app for the monorepo.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Turborepo
- Bun (workspace package manager)

## Location

- App folder: apps/frontends
- Package name: web

## Prerequisites

- Node.js 18+
- Bun 1.3.14+

## Install Dependencies

From the monorepo root:

```bash
bun install
```

## Run In Development

You can run from either the monorepo root or this app folder.

From monorepo root:

```bash
bun run dev
```

From apps/frontends:

```bash
bun run dev
```

The app runs on:

- http://localhost:3000

## Build

From apps/frontends:

```bash
bun run build
```

From monorepo root (all apps/packages via Turbo):

```bash
bun run build
```

## Start Production Server

From apps/frontends:

```bash
bun run start
```

## Lint And Type Check

From apps/frontends:

```bash
bun run lint
bun run check-types
```

From monorepo root:

```bash
bun run lint
bun run check-types
```

## Notes

- This app uses shared workspace packages, including @repo/ui.
- Next config is in apps/frontends/next.config.js.
