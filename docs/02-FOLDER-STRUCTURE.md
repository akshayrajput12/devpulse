# DevPulse — Folder Structure
## Industry-Level, Fault-Isolated Architecture

---

## Principle: Vertical Slices, Not Horizontal Layers

Bad structure groups by type: `/components`, `/hooks`, `/utils`
Good structure groups by **domain**: `/features/reviews`, `/features/auth`

This means if the billing feature breaks, it cannot cascade into the reviews feature.
If you delete a feature folder, the app still compiles.

---

## Full Folder Tree

```
devpulse/
│
├── apps/
│   ├── web/                          ← Next.js 15 app (Vercel)
│   │   ├── app/
│   │   │   ├── layout.tsx            ← Root layout (fonts, providers, global CSS)
│   │   │   ├── globals.css           ← CSS custom properties ONLY (no component styles)
│   │   │   │
│   │   │   ├── (marketing)/          ← Route group: no auth required
│   │   │   │   ├── page.tsx          ← Landing page (SSG)
│   │   │   │   ├── pricing/page.tsx
│   │   │   │   └── layout.tsx        ← Marketing nav/footer
│   │   │   │
│   │   │   ├── (auth)/               ← Route group: auth pages
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── callback/page.tsx ← Supabase OAuth callback handler
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── (dashboard)/          ← Route group: requires auth (Middleware guards)
│   │   │   │   ├── layout.tsx        ← Dashboard shell (sidebar, header)
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── page.tsx      ← Review history, stats
│   │   │   │   │   ├── loading.tsx   ← Skeleton (Suspense boundary)
│   │   │   │   │   └── error.tsx     ← Error boundary
│   │   │   │   ├── reviews/
│   │   │   │   │   ├── page.tsx      ← Review list
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── page.tsx  ← Single review detail
│   │   │   │   │   │   └── loading.tsx
│   │   │   │   │   └── new/page.tsx  ← Submit PR for review
│   │   │   │   ├── settings/
│   │   │   │   │   ├── page.tsx      ← Profile settings
│   │   │   │   │   ├── team/page.tsx ← Team management
│   │   │   │   │   └── billing/page.tsx ← Plan + invoices
│   │   │   │   └── team/
│   │   │   │       └── [teamId]/page.tsx
│   │   │   │
│   │   │   ├── r/
│   │   │   │   └── [shareToken]/page.tsx ← Public share page (no auth)
│   │   │   │
│   │   │   └── api/
│   │   │       ├── reviews/
│   │   │       │   ├── route.ts      ← POST: create review job
│   │   │       │   └── [id]/route.ts ← GET: review status
│   │   │       ├── github/
│   │   │       │   └── webhook/route.ts ← GitHub App events
│   │   │       ├── razorpay/
│   │   │       │   ├── create-order/route.ts
│   │   │       │   └── webhook/route.ts
│   │   │       └── health/route.ts
│   │   │
│   │   ├── features/                 ← Domain-scoped feature modules
│   │   │   ├── reviews/
│   │   │   │   ├── components/
│   │   │   │   │   ├── ReviewCard.tsx
│   │   │   │   │   ├── ReviewFindingsList.tsx
│   │   │   │   │   ├── ReviewScoreBadge.tsx
│   │   │   │   │   ├── ReviewSkeleton.tsx
│   │   │   │   │   └── PRUrlForm.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useReviews.ts    ← Supabase query hooks
│   │   │   │   │   └── useReviewRealtime.ts ← Supabase Realtime subscription
│   │   │   │   ├── actions/
│   │   │   │   │   └── createReview.ts  ← Server Action
│   │   │   │   ├── schemas/
│   │   │   │   │   └── review.schema.ts ← Zod schemas
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── components/
│   │   │   │   │   ├── LoginButton.tsx
│   │   │   │   │   └── UserAvatar.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useUser.ts
│   │   │   │   └── actions/
│   │   │   │       └── signOut.ts
│   │   │   │
│   │   │   ├── billing/
│   │   │   │   ├── components/
│   │   │   │   │   ├── PlanCard.tsx
│   │   │   │   │   ├── UsageBar.tsx
│   │   │   │   │   └── RazorpayButton.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useSubscription.ts
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── teams/
│   │   │   │   ├── components/
│   │   │   │   │   ├── TeamMemberList.tsx
│   │   │   │   │   ├── InviteMemberForm.tsx
│   │   │   │   │   └── RoleBadge.tsx
│   │   │   │   └── hooks/
│   │   │   │       └── useTeam.ts
│   │   │   │
│   │   │   └── dashboard/
│   │   │       └── components/
│   │   │           ├── StatsCard.tsx
│   │   │           ├── RecentActivity.tsx
│   │   │           └── QuickReviewWidget.tsx
│   │   │
│   │   ├── components/               ← Global shared UI (not feature-specific)
│   │   │   ├── ui/                   ← shadcn/ui components (auto-generated, owned)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MarketingNav.tsx
│   │   │   │   └── Footer.tsx
│   │   │   └── common/
│   │   │       ├── AnimatedPage.tsx     ← Framer Motion page wrapper
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   │
│   │   ├── lib/                      ← Pure utility functions (no side effects)
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         ← Browser client (singleton)
│   │   │   │   ├── server.ts         ← Server client (per-request)
│   │   │   │   ├── middleware.ts     ← Middleware client
│   │   │   │   └── types.ts          ← Auto-generated DB types
│   │   │   ├── redis.ts              ← Upstash Redis client
│   │   │   ├── openai.ts             ← OpenAI client config
│   │   │   ├── github.ts             ← GitHub API helpers
│   │   │   ├── razorpay.ts           ← Razorpay client (server-only)
│   │   │   ├── utils.ts              ← cn(), formatDate(), etc.
│   │   │   └── constants.ts          ← PLANS, LIMITS, ROUTES
│   │   │
│   │   ├── middleware.ts             ← Next.js Middleware (auth guard)
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── payment-api/                  ← Razorpay Express server (Railway)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── orders.ts         ← POST /create-order
│       │   │   ├── webhook.ts        ← POST /webhook
│       │   │   └── subscriptions.ts  ← GET /status/:userId
│       │   ├── middleware/
│       │   │   ├── verifySignature.ts
│       │   │   └── idempotency.ts
│       │   ├── lib/
│       │   │   ├── razorpay.ts
│       │   │   ├── redis.ts
│       │   │   └── supabase.ts       ← Service role client
│       │   └── app.ts
│       ├── Dockerfile
│       └── package.json
│
├── supabase/                         ← Supabase project config (git tracked)
│   ├── migrations/                   ← SQL migration files (versioned)
│   │   ├── 20250101000001_init.sql
│   │   ├── 20250101000002_rls.sql
│   │   └── 20250101000003_functions.sql
│   ├── functions/                    ← Edge Functions (Deno)
│   │   ├── process-review/
│   │   │   └── index.ts
│   │   └── send-notification/
│   │       └── index.ts
│   ├── seed.sql                      ← Dev seed data
│   └── config.toml
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    ← Lint, type-check, test on PR
│       └── deploy.yml                ← Deploy on merge to main
│
├── docs/                             ← This folder (all MD files)
│   ├── 00-PROJECT-IDEA.md
│   ├── 01-TECH-STACK.md
│   ├── 02-FOLDER-STRUCTURE.md        ← this file
│   ├── 03-SYSTEM-DESIGN.md
│   ├── 04-SUPABASE.md
│   ├── 05-DESIGN-SYSTEM.md
│   └── 06-SETUP-PROMPT.md
│
├── package.json                      ← Workspace root (npm workspaces)
└── turbo.json                        ← Turborepo pipeline
```

---

## Fault Isolation Rules

1. **Feature folders are self-contained.** A feature's components, hooks, actions, and types live together. Deleting `/features/billing` should not break `/features/reviews`.

2. **`lib/` has zero business logic.** It's infrastructure — clients, helpers, constants. Business logic lives in `features/*/actions/`.

3. **`components/ui/` is stateless.** No Supabase calls, no routing, no global state. Pure presentational.

4. **Payment API is a separate process.** If Railway goes down, users can still review PRs — they just can't upgrade. No shared code with the Next.js app except types.

5. **Supabase Edge Functions are independent.** If `process-review` throws an unhandled error, it fails gracefully — the job row status becomes `failed`, shown to the user. The marketing page still loads.

6. **`(marketing)` route group uses SSG.** Even if Supabase is unreachable, the landing page serves from Cloudflare cache indefinitely.

---

## Import Convention

```typescript
// Always use path aliases, never relative ../../
import { ReviewCard } from '@/features/reviews/components/ReviewCard'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
```

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
