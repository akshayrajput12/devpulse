# DevPulse — AI Code Review SaaS
## Complete Project Idea Breakdown

---

## What Is DevPulse?

DevPulse is a **micro SaaS** that gives developers instant, structured AI-powered code reviews on any GitHub Pull Request. You paste a PR URL (or install our GitHub App for automatic reviews), and within seconds you get:

- A severity-ranked list of bugs, security holes, and performance issues
- Line-by-line suggestions with code snippets
- An overall PR health score (0–100)
- A plain-English summary your non-technical lead can read

**Target users:** Solo developers, small dev teams, open-source maintainers, bootcamp graduates trying to level up.

**Pain being solved:** Senior code reviewers are expensive and scarce. Junior devs ship bugs because no one reviews their PRs thoroughly. AI can catch 70% of common issues in seconds.

---

## Core Features (MVP)

| Feature | Description |
|---|---|
| PR Review on demand | Paste any public GitHub PR URL → get instant AI review |
| GitHub App | Install once → all PRs auto-reviewed on open |
| Review dashboard | History of all reviews, filterable by severity |
| Team workspace | Invite teammates, shared review history |
| Public review link | Share a read-only review link (like Notion pages) |
| Webhook delivery | POST review results to your Slack / endpoint |

---

## Free APIs & Services Used

| Service | Purpose | Free Tier |
|---|---|---|
| **GitHub REST API** | Fetch PR diffs, metadata, file trees | 5,000 req/hr unauthenticated, 15,000/hr with OAuth token |
| **GitHub Apps API** | Receive PR events via webhook | Free, unlimited |
| **Gemini API** | gemini 3.0 preview for review generation | Pay-per-use (1M free tokens/month) |
| **Supabase** | Auth, Postgres DB, Realtime, Edge Functions, Storage | 500MB DB, 50k MAU, 500k edge invocations free |
| **Upstash Redis** | Rate limiting, job queue, caching | 10,000 commands/day free tier |
| **Cloudflare CDN** | Static asset delivery, DDoS protection | Free plan |
| **Resend** | Transactional emails (invites, notifications) | 3,000 emails/month free |
| **Razorpay** | Payment gateway (India-first) | No monthly fee, 2% per transaction |
| **Railway / Render** | Backend API + worker deployment | Free hobby tier |
| **Vercel** | Next.js frontend hosting | Free hobby tier |
| **GitHub Actions** | CI/CD pipeline | 2,000 min/month free |
| **Sentry** | Error monitoring | 5,000 errors/month free |

---

## Revenue Model

| Plan | Price (INR) | Reviews/mo | Repos | Team members |
|---|---|---|---|---|
| Free | ₹0 | 5 | 1 | 1 |
| Pro | ₹499/mo | 100 | 10 | 1 |
| Team | ₹1,499/mo | 500 | unlimited | 10 |

Razorpay handles subscriptions natively — no custom billing logic needed.

---

## What Makes This Resume-Worthy

1. **Supabase RLS (Row Level Security)** — data isolation at DB level, not app level
2. **Supabase Realtime** — live review status without polling
3. **Supabase Edge Functions** — serverless workers for AI processing (Deno runtime)
4. **Upstash Redis** — distributed rate limiting across edge workers
5. **GitHub App** — OAuth App vs GitHub App distinction (most devs don't know this)
6. **Razorpay webhooks** — idempotent payment event processing
7. **Cloudflare CDN** — cache headers, edge caching strategy
8. **Framer Motion** — production-grade animations tied to real data states

---

## User Journey (Happy Path)

```
1. User lands on marketing page (Next.js SSG, Cloudflare CDN)
2. Clicks "Sign in with GitHub" → Supabase Auth OAuth flow
3. Onboarding: paste first PR URL
4. Review request hits Next.js API route → validates → inserts job row in Supabase
5. Supabase Edge Function picks up job → calls GitHub API → calls OpenAI
6. Supabase Realtime pushes status update to client
7. Review renders with Framer Motion entrance animation
8. User shares public review link with their team
9. User hits free limit → Razorpay checkout → plan upgrades instantly
10. GitHub App installed → future PRs auto-reviewed on open
```
