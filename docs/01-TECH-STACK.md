# DevPulse — Tech Stack

## Decision Log (Why Each Choice)

Every tool here was chosen deliberately. This file explains *why*, not just *what*.

---

## Frontend

### Next.js 15 (App Router)
- **Why:** Server Components fetch data without useEffect waterfalls. `loading.tsx` and `error.tsx` colocated with pages. Streaming SSR for fast TTFB.
- **Pattern used:** Server Components for data display, Client Components only for interactivity (forms, animations, Realtime subscriptions).
- **Key files:** `app/layout.tsx` (providers), `app/(dashboard)/layout.tsx` (protected shell), `app/(marketing)/page.tsx` (landing, SSG).

### Tailwind CSS v4
- **Why:** Utility-first, zero runtime, perfectly pairs with Server Components.
- **Rule:** No raw hex codes anywhere. All colors via CSS custom properties defined in `globals.css`.

### Framer Motion
- **Why:** Production-grade animations. Used specifically for: page transitions, review card entrances (staggered), skeleton-to-content swap, loading states.
- **Rule:** All animations wrapped in `<AnimatePresence>`. Respect `prefers-reduced-motion`.

### shadcn/ui
- **Why:** Headless, accessible components. We own the code — no dependency lock-in.
- **Usage:** Dialog, DropdownMenu, Tooltip, Badge, Tabs, Separator, ScrollArea, Command palette.

---

## Backend / Data

### Supabase (Primary data layer)
Used for **everything** data-related. No separate backend server needed for CRUD.

| Supabase Feature | Used For |
|---|---|
| **Auth** | GitHub OAuth, session management, JWT |
| **Postgres** | All relational data (users, reviews, teams) |
| **Row Level Security** | Data isolation — users only see their data |
| **custom api |
| **Realtime** | Live review status updates to client |
| **Storage** | PR diff files > 50KB (avoids DB bloat) |

### How we call Supabase (professional pattern)

```
Server Component → supabase/server.ts → createServerClient (cookies)
Client Component → supabase/client.ts → createBrowserClient (singleton)
API Route        → supabase/server.ts → createServerClient (cookies)
Edge Function    → Supabase JS v2 with service role key (internal only)
```

**Never:**
- ❌ `createClient` with anon key on server (session not forwarded)
- ❌ Service role key exposed to browser
- ❌ Bypassing RLS from client components

### Upstash Redis (via @upstash/redis)
- **Why Upstash:** Serverless-native Redis. Works in Edge Functions and Vercel serverless. No persistent connection needed (HTTP-based SDK).
- **Used for:**
  - Rate limiting (token bucket, per user)
  - Idempotency keys (Razorpay webhook dedup)
  - Job status cache (avoid DB reads during polling)
  - Plan quota counters (monthly review counts)

---

## Payments

### Razorpay
- **Why:** India-first, best UPI support, subscriptions API built-in, webhook reliability is excellent.
- **Integration:** Custom API route at `/api/razorpay/` deployed on Railway.
- **Webhook:** Verified with `razorpay-signature` header, idempotency via Upstash Redis.
- **Plans:** Created in Razorpay dashboard, referenced by plan ID in our DB.

---

## Infrastructure

### Vercel
- Next.js frontend + API routes
- Automatic preview deployments per PR (great for demoing to interviewers)
- Edge Middleware for auth redirects

### Railway (Razorpay API)
- Lightweight Express server for Razorpay webhook receiver and checkout session creation
- Isolated from main app — if payment API goes down, rest of app still works
- Free hobby tier covers it

### Cloudflare CDN
- Sits in front of Vercel
- Caches static assets at edge (CSS, JS, images)
- DDoS protection for free
- Custom domain SSL

### GitHub Actions
- On push to `main`: lint → type-check → Supabase migration → Vercel deploy
- On PR: lint + type-check only (no deploy)

---

## Developer Experience

| Tool | Purpose |
|---|---|
| TypeScript (strict) | Catch bugs before runtime |
| Zod | Runtime validation + type inference for all API inputs |
| ESLint + Prettier | Consistent code style |
| Husky + lint-staged | Pre-commit hooks |
| `supabase/types.ts` | Auto-generated DB types (supabase gen types typescript) |

---

## What Runs Where

```
Browser
└── Next.js Client Components (React)
    └── Supabase browser client (anon key, RLS enforced)
    └── Upstash Redis (never — server only)

Vercel Edge (Middleware)
└── Auth redirect checks (reads Supabase session cookie)

Vercel Serverless (API Routes)
└── /api/reviews/create → validate → insert Supabase row → trigger Edge Function
└── /api/github/webhook → verify signature → insert PR job
└── /api/razorpay/* → proxy to Railway (keeps Razorpay key server-side)

custom api 
└── process-review → fetch GitHub diff → call OpenAI → update Supabase row
└── send-notification → call nodemailer sending mail api 

Railway Express Server
└── POST /razorpay/create-order → Razorpay API
└── POST /razorpay/webhook → verify → Upstash dedup → update Supabase
└── GET  /razorpay/subscription-status → return plan info

Cloudflare CDN
└── Caches Vercel static output
└── Routes API traffic (no cache)
```
