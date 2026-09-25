# Global Video Platform (GVP)

GVP is the neutral internal project name for a global video-sharing and streaming platform. This repository starts with a modular monolith, background processing boundaries, PostgreSQL metadata, Redis coordination, S3-compatible media storage, and a CDN-ready delivery model.

## Workspace

- `apps/web`: Next.js viewer and creator-studio shell
- `apps/api`: NestJS modular monolith API
- `packages/contracts`: shared API contracts
- `docs/architecture.md`: system architecture and evolution plan

## Local setup

1. Copy `.env.example` to `.env` and adjust storage credentials when needed.
2. Run `docker compose up -d` for PostgreSQL and Redis.
3. Run `npm install`.
4. Run `npm run db:validate` with `DATABASE_URL` set.
5. Run `npm run db:migrate -- --name init` to create the initial PostgreSQL migration.
6. Run `npm run typecheck` and `npm run build`.
7. Start the API with `npm run dev:api` and the web app with `npm run dev:web`.

The initial surfaces are intentionally small. Prisma models live in `packages/database/prisma/schema.prisma`; API modules should access them through repositories and the shared `PrismaService`. Workers and provider adapters should be added behind the boundaries documented in `docs/architecture.md`.
