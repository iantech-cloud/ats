# ChatConnect

A premium M-Pesa-gated chatbot platform where users pay Ksh 50 to access the platform and Ksh 20 per AI companion bot to start chatting.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/chatbot-web run dev` — run the frontend (port 25493)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `POST /api/admin/seed` — seed the 6 default bot profiles into MongoDB

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB + Mongoose (via MONGODB_URI secret)
- Payments: M-Pesa Daraja API (STK Push)
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- Validation: Zod (via Orval codegen from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/` — Express backend
  - `src/lib/mongodb.ts` — MongoDB connection
  - `src/lib/mpesa.ts` — M-Pesa Daraja STK Push helper
  - `src/models/` — Mongoose models (Bot, User, Payment, ChatMessage)
  - `src/routes/` — Route handlers (auth, bots, payments, chat)
- `artifacts/chatbot-web/src/` — React frontend
  - `src/pages/` — Landing, Bots browse, Chat, Pay
  - `src/hooks/use-auth.ts` — Phone/session state management
  - `src/components/` — Navbar, PhoneModal

## Architecture decisions

- MongoDB used instead of PostgreSQL (user requested). The existing `@workspace/db` Drizzle/Postgres package is not used.
- M-Pesa currently configured for **sandbox** (sandbox.safaricom.co.ke). Change to production URL in `src/lib/mpesa.ts` when going live.
- Bot responses use pre-written scripts cycling through indices based on message count.
- User identity is phone-number based — stored in localStorage. No traditional auth.
- Payment webhooks from Safaricom are received at `/api/payments/callback`.

## Product

- Landing page with "Chat Online" CTA
- Phone number collection → M-Pesa STK push (Ksh 50) to unlock platform
- Bot browse grid (like a dating app) with lock overlays for unpaid bots
- Per-bot unlock (Ksh 20 STK push) before chatting
- Full messenger-style chat with bot scripted responses
- Admin endpoints: POST /api/admin/bots (create), POST /api/admin/seed (seed defaults)

## User preferences

- MongoDB Atlas for database
- M-Pesa Daraja API for payments
- Pre-written bot scripts (not AI)
- Sandbox mode for M-Pesa (can switch to production)

## Gotchas

- **M-Pesa sandbox**: Uses sandbox.safaricom.co.ke — switch URLs in `src/lib/mpesa.ts` for production
- **Callback URL must be public**: MPESA_CALLBACK_URL must be a publicly accessible HTTPS URL
- After spec changes, always run codegen before using generated types
- Seed bots once: `POST /api/admin/seed` is idempotent (won't re-seed if bots exist)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
