# Competitive Programming Platform

A full-stack coding practice platform — browse problems, submit solutions, get them judged against test cases in isolated Docker containers, track streaks, and compete on a leaderboard.

Built as a Turborepo monorepo with Bun.

## Architecture

```mermaid

flowchart TB
    subgraph Client["Client"]
        FE["Next.js Frontend<br/>(apps/frontends)"]
    end

    subgraph Vercel["Vercel"]
        FE
    end

    subgraph Backend["Backend API — apps/backend (Express, Bun)"]
        direction TB
        API["Express App<br/>index.ts"]
        AUTH["/auth<br/>JWT + bcrypt"]
        PROB["/problems<br/>problems-service"]
        SUB["/api<br/>code-submisson"]
        STREAK["/streaks<br/>streaks.ts"]
        LEAD["/leaderboard"]
        MW["authMiddleware"]

        API --> AUTH
        API --> PROB
        API --> SUB
        API --> STREAK
        API --> LEAD
        MW -.protects.-> SUB
        MW -.protects.-> STREAK
    end

    subgraph RenderHost["Render (persistent web service)"]
        Backend
    end

    subgraph Shared["Shared Packages — packages/"]
        DB["@repo/db<br/>Prisma + pg adapter"]
        QUEUE["@repo/queue<br/>RabbitMQ client"]
        RUNNER["@repo/code-runner<br/>dockerode"]
    end

    subgraph VPS["VPS / Oracle Free Tier (Docker host)"]
        direction TB
        BROKER["RabbitMQ Broker"]
        WORKER["Code Execution Worker<br/>consumes submission queue"]
        SANDBOX["Ephemeral Docker Containers<br/>(run untrusted user code)"]
        WORKER -->|dockerode| SANDBOX
    end

    subgraph DataStore["Managed Postgres (pooled)"]
        PG[("PostgreSQL<br/>users, problems, submissions,<br/>leaderboard, streaks")]
    end

    FE -->|HTTPS REST| API
    AUTH --> DB
    PROB --> DB
    STREAK --> DB
    LEAD --> DB
    SUB -->|publish job| QUEUE
    QUEUE -->|AMQP| BROKER
    BROKER -->|consume job| WORKER
    WORKER -->|write result| DB
    DB -->|Prisma Client| PG

    classDef vercel fill:#000,color:#fff,stroke:#000
    classDef render fill:#5b21b6,color:#fff,stroke:#5b21b6
    classDef vps fill:#0f766e,color:#fff,stroke:#0f766e
    classDef db fill:#1e3a8a,color:#fff,stroke:#1e3a8a
    class FE vercel
    class API,AUTH,PROB,SUB,STREAK,LEAD,MW render
    class BROKER,WORKER,SANDBOX vps
    class PG,DB db
```

### Request flow

1. **Frontend** (Next.js on Vercel) calls the backend over HTTPS.
2. **Backend** (Express on Render) handles `/auth`, `/problems`, `/leaderboard`, `/streaks` directly against Postgres via `@repo/db` (Prisma).
3. **Code submission** (`/api`) doesn't execute code inline — it publishes a job to RabbitMQ via `@repo/queue` and returns immediately.
4. A separate **worker process**, running on a VPS with Docker access, consumes the queue and uses `@repo/code-runner` (`dockerode`) to spin up an isolated container per submission, run the user's code against test cases, and write the result back to Postgres.
5. The frontend polls or re-fetches submission status once the worker finishes.

This split exists because serverless/PaaS platforms (Vercel, Render, Railway) don't expose a Docker socket to your app — only a real VM can safely run arbitrary untrusted code in containers.

## Monorepo layout

```
.
├── apps/
│   ├── backend/            # Express API (auth, problems, submissions, streaks, leaderboard)
│   └── frontends/          # Next.js app
├── packages/
│   ├── database/           # Prisma schema, generated client, @repo/db
│   ├── code-runner/        # dockerode-based sandboxed execution, @repo/code-runner
│   ├── rabbit-mq/          # AMQP client, @repo/queue
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/                 # shared React components
├── docker-compose.yml
├── turbo.json
└── bun.lock
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend API | Express, TypeScript, Bun |
| Database | PostgreSQL, Prisma 7 (`@prisma/adapter-pg`) |
| Queue | RabbitMQ (`amqplib`) |
| Code execution | Docker (`dockerode`) |
| Auth | JWT, bcrypt |
| Monorepo tooling | Turborepo, Bun workspaces |

## Deployment

| Component | Platform |
|---|---|
| Frontend (`apps/frontends`) | Vercel |
| Backend API (`apps/backend`) | Render (persistent web service) |
| Code execution worker + RabbitMQ | VPS with Docker (e.g. Oracle free tier / Hetzner) |
| PostgreSQL | Managed Postgres with a pooled connection string (e.g. Neon/Supabase) |

### Free deployment path

The cheapest/free setup for this project is:

| Component | Free option | Notes |
|---|---|---|
| Frontend | Vercel Hobby | Deploy `apps/frontends` as the Next.js app. |
| Backend API | Render free web service | Deploy `apps/backend` using the root `Dockerfile` or Bun build/start commands. |
| PostgreSQL | Neon/Supabase free tier | Use the pooled `DATABASE_URL` in all services that access Prisma. |
| RabbitMQ + worker | Oracle Cloud Free Tier VM | Needed only if you keep the Docker-based code runner. |

The frontend must point at the deployed backend URL. Do not leave `API_BASE` as `http://localhost:3001` in production.

### No-VPS alternative

A VPS is only required because the current judging flow runs user code inside Docker containers. If you want to avoid managing a VM, replace the RabbitMQ + worker + Docker runner with a managed code execution API.

Recommended free/demo-friendly option:

| Component | Replacement |
|---|---|
| RabbitMQ | Remove it for the simple version, or keep it only for async status updates. |
| Worker process | Replace with direct calls from the backend. |
| `@repo/code-runner` Docker execution | Replace with Piston API or a hosted Judge0 API. |

With that approach the architecture becomes:

```txt
Vercel        -> Next.js frontend
Render        -> Express/Bun backend
Neon/Supabase -> Postgres
Piston/Judge0 -> Code execution
```

This is easier to deploy for free because no service needs Docker socket access. The tradeoff is less control over execution limits, supported languages, queue behavior, and reliability.

## Local development

```bash
# install everything from the repo root
bun install

# spin up Postgres + RabbitMQ locally
docker compose up -d

# generate Prisma client
cd packages/database && bunx prisma generate

# run all apps via Turborepo
cd ../.. && bun run dev
```

## Environment variables

Each app/package reads its own `.env`. At minimum you'll need:

```
DATABASE_URL=postgres://...?sslmode=verify-full
JWT_SECRET=...
RABBITMQ_URL=amqp://...
```
