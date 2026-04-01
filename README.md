<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo" alt="Turborepo" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

# PortalPro

**White-Label Client Portal Builder for Agencies & Consultants**

PortalPro is a multi-tenant SaaS platform that lets agencies create branded client portals for project management, file sharing, real-time communication, deliverable approvals, and invoicing — all under their own brand.

---

## Why PortalPro?

Agencies juggle emails, Drive links, Notion docs, and separate invoicing tools. Clients have no single place to check project status. PortalPro solves this by providing one branded hub per client with:

- **Project & Task Management** — Kanban boards, milestones, dependencies, time tracking
- **File Sharing** — Upload, version history, in-browser preview (PDF, images)
- **Real-time Messaging** — Threaded conversations with rich text and @mentions
- **Deliverable Approvals** — Multi-stage review workflows with revision tracking
- **Invoicing** — Multi-currency invoices with Stripe payment links
- **White-Label Branding** — Custom logo, colors, and domain per client portal
- **International-First** — GBP/EUR/USD/AED, RTL Arabic support, GDPR-ready

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Frontend** | Next.js 14+ (App Router), React 18, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL (Supabase), Prisma ORM |
| **Auth** | NextAuth.js v5 (magic link + credentials) |
| **File Storage** | Cloudflare R2 (S3-compatible) |
| **Email** | Resend (transactional) |
| **Payments** | Stripe Payment Links |
| **Real-time** | Socket.io |
| **Cache** | Upstash Redis |
| **Deployment** | Vercel |

---

## Architecture

```
portalpro/
├── apps/
│   ├── agency/       ← Agency Dashboard      (Next.js, port 3000)
│   ├── portal/       ← Client Portal         (Next.js, port 3001)
│   └── api/          ← REST API Server       (Express,  port 4000)
│
├── packages/
│   ├── database/     ← Prisma schema, client, tenant isolation middleware
│   ├── ui/           ← Shared component library (shadcn/ui based)
│   ├── utils/        ← Pure utilities (formatting, validation)
│   ├── types/        ← TypeScript types, Zod schemas, API contracts
│   ├── email/        ← Email templates (react-email)
│   ├── auth/         ← NextAuth config, RBAC guards
│   └── config/       ← Shared Tailwind preset with design tokens
│
├── tooling/
│   ├── eslint/       ← Shared ESLint config
│   ├── typescript/   ← Shared tsconfig presets
│   └── prettier/     ← Shared Prettier config
│
└── infra/
    └── docker/       ← Docker Compose (PostgreSQL + Redis)
```

**Multi-tenancy**: Shared database with application-level row isolation via Prisma middleware. Every tenant-scoped query is automatically filtered by `tenantId`.

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 20.x LTS or higher | `node --version` |
| **pnpm** | 10.x | `pnpm --version` |
| **Docker** | Latest (for local DB) | `docker --version` |
| **Git** | Latest | `git --version` |

If you don't have pnpm installed:
```bash
npm install -g pnpm
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/portalpro.git
cd portalpro
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values. For local development, the defaults work for the database if you use the Docker setup in the next step.

Generate a NextAuth secret:
```bash
openssl rand -base64 32
```

Paste the output as the value of `NEXTAUTH_SECRET` in `.env.local`.

### 4. Start the database

**Option A: Docker (recommended)**

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379) locally.

**Option B: Supabase**

Create a free project at [supabase.com](https://supabase.com), copy the connection string, and set `DATABASE_URL` and `DIRECT_URL` in `.env.local`.

### 5. Set up the database schema

```bash
# Push the Prisma schema to the database
pnpm db:push

# (Optional) Seed with sample data
pnpm db:seed
```

### 6. Generate the Prisma client

```bash
cd packages/database
pnpm exec prisma generate
cd ../..
```

### 7. Start all apps in development mode

```bash
pnpm dev
```

This starts all three apps concurrently via Turborepo:

| App | URL | Description |
|-----|-----|-------------|
| Agency Dashboard | [http://localhost:3000](http://localhost:3000) | Agency team workspace |
| Client Portal | [http://localhost:3001](http://localhost:3001) | Client-facing branded portal |
| API Server | [http://localhost:4000](http://localhost:4000) | REST API backend |

You can also start individual apps:
```bash
pnpm dev --filter=@portalpro/agency    # Agency dashboard only
pnpm dev --filter=@portalpro/portal    # Client portal only
pnpm dev --filter=@portalpro/api       # API server only
```

---

## Available Scripts

All scripts run from the monorepo root via Turborepo:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Production build for all apps and packages |
| `pnpm lint` | Run ESLint across the entire monorepo |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without modifying |
| `pnpm clean` | Remove all build artifacts |
| `pnpm db:push` | Push Prisma schema to the database |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed the database with sample data |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |

---

## Third-Party Service Setup

These services are optional for local development but required for full functionality:

| Service | Purpose | Free Tier | Setup |
|---------|---------|-----------|-------|
| **Supabase** | PostgreSQL database | 500MB, 2 connections | [supabase.com](https://supabase.com) |
| **Cloudflare R2** | File storage | 10GB storage | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **Resend** | Transactional email | 100 emails/day | [resend.com](https://resend.com) |
| **Stripe** | Payment processing | Pay-per-use (2.9% + 30c) | [stripe.com](https://stripe.com) |
| **Upstash** | Redis (cache/rate limit) | 10K commands/day | [upstash.com](https://upstash.com) |

---

## Project Structure Deep Dive

### Apps

- **`apps/agency`** — The agency-facing dashboard where teams manage clients, projects, tasks, files, and invoices. Built with Next.js App Router and server components.

- **`apps/portal`** — The client-facing portal. Lightweight, mobile-first, and white-label themed. Clients see their projects, review deliverables, send messages, and pay invoices here.

- **`apps/api`** — The shared REST API server. Follows a strict layered architecture: Route → Controller → Service → Prisma. Handles auth, tenant resolution, RBAC, and all business logic.

### Shared Packages

- **`@portalpro/database`** — Prisma schema with 19 models, singleton client, and tenant isolation middleware that auto-filters all queries by `tenantId`.

- **`@portalpro/ui`** — Shared React component library built on shadcn/ui patterns. Includes Button, Input, Card, Badge, StatusBadge with PortalPro design tokens.

- **`@portalpro/types`** — Single source of truth for TypeScript interfaces, Zod validation schemas, error classes, and API contracts shared between frontend and backend.

- **`@portalpro/utils`** — Pure utility functions: currency formatting (multi-locale), date formatting, string helpers, validation (email, slug, color).

- **`@portalpro/auth`** — NextAuth.js v5 configuration, RBAC role hierarchy (OWNER > ADMIN > EDITOR > VIEWER), and permission guard helpers.

- **`@portalpro/config`** — Shared Tailwind CSS preset containing the full PortalPro design system: color palette, typography, animations, shadows.

---

## Design System

| Role | Color | Hex |
|------|-------|-----|
| Primary | Deep Teal | `#1B4D6E` |
| Primary Light | Ocean Blue | `#2E86AB` |
| Primary Dark | Midnight | `#0F3049` |
| Accent | Warm Gold | `#E8B931` |
| Success | Green | `#16A34A` |
| Warning | Yellow | `#EAB308` |
| Error | Red | `#DC2626` |

**Typography**: Inter (Latin/Cyrillic), Noto Sans Arabic (RTL), JetBrains Mono (code).

---

## License

MIT
