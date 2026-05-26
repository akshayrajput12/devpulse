# DevPulse — System Design
## Production-Grade Architecture Decisions

---

## The Core Problem to Solve

AI review generation takes 8–25 seconds. A naive implementation would:
- Hold the HTTP connection open (times out at 30s on Vercel)
- Block the UI
- Fail silently if OpenAI is slow

Our architecture solves this with **async job processing** + **Supabase Realtime**.

---

## Request Flow: PR Review (End to End)

```
User submits PR URL
       │
       ▼
[Next.js API Route: POST /api/reviews]
  1. Authenticate via Supabase session cookie
  2. Validate URL with Zod
  3. Check rate limit in Upstash Redis (token bucket)
  4. Check plan quota in Upstash Redis (monthly counter)
  5. Insert review row → status: 'pending'
  6. Invoke Supabase Edge Function (async, fire-and-forget)
  7. Return { reviewId, status: 'pending' } ← 202 in ~50ms
       │
       ▼
[Client receives reviewId]
  Subscribes to Supabase Realtime channel: reviews:{reviewId}
  Shows skeleton UI with Framer Motion pulse animation
       │
       ▼
[custom api: process-review]
  1. Fetch PR metadata from GitHub API
  2. Fetch PR diff (paginated, max 3000 lines)
  3. Chunk diff into ≤8000 token segments
  4. Call OpenAI GPT-4o-mini (structured JSON output)
  5. Merge findings from all chunks
  6. Update review row → status: 'complete', store findings JSON
  7. Supabase Postgres triggers Realtime broadcast automatically
       │
       ▼
[Client receives Realtime update]
  Framer Motion animates findings cards in (staggered entrance)
  Review is live.
```

---

## Rate Limiting Strategy

### Two separate limits (both in Upstash Redis)

**1. API Rate Limit** — prevents abuse, plan-independent
```
Free:  10 requests/minute
Pro:   60 requests/minute
Team:  200 requests/minute
```
Algorithm: Token bucket (allows short bursts, penalizes sustained abuse).

**2. Monthly Quota** — enforces plan limits
```
Free:  5 reviews/month
Pro:   100 reviews/month
Team:  500 reviews/month
```
Counter key: `quota:reviews:{userId}:{YYYY-MM}`
Resets automatically (key expires at end of month).

### Why Upstash, not Supabase for rate limits?
Supabase Postgres round-trip = ~20ms. Upstash Redis round-trip = ~1ms.
Rate limiting runs on every request — it must be sub-millisecond.
Supabase Realtime is wrong for this; Redis counters are right.

---

## Supabase Realtime: How Review Status Updates Work

```typescript
// Client subscribes immediately after job creation
const channel = supabase
  .channel(`review:${reviewId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'reviews',
    filter: `id=eq.${reviewId}`,
  }, (payload) => {
    // This fires automatically when Edge Function updates the row
    setReview(payload.new)
  })
  .subscribe()

// Cleanup on unmount
return () => supabase.removeChannel(channel)
```

No polling. No WebSocket server to manage. Supabase handles the entire pub/sub infrastructure.

---

## GitHub API: No Rate Limit Issues

### Problem
GitHub API: 60 req/hr unauthenticated. That's nothing.

### Solution: Use the user's own GitHub token
When user signs in with GitHub OAuth, we store their GitHub access token (encrypted) in Supabase.
All GitHub API calls use that token → 5,000–15,000 req/hr per user.

### Additional: Conditional requests (ETag caching)
```typescript
// First request
const response = await github.request('GET /repos/{owner}/{repo}/pulls/{id}', {
  headers: { 'If-None-Match': cachedEtag }
})
// If PR hasn't changed: 304 Not Modified → doesn't count against rate limit
```

### GitHub App for webhook-based reviews
GitHub Apps get a higher limit: 15,000 req/hr installation-wide.
PR opened event → our webhook → process review automatically.
User doesn't have to paste URL.

---

## Database Design Decisions

### Row Level Security (RLS) — Data Isolation

Every table has RLS enabled. Users cannot access data they don't own at the DB level.
This is not optional. This is not defensive — it's the correct architecture.

```sql
-- Users can only read/write their own reviews
CREATE POLICY "users_own_reviews" ON reviews
  FOR ALL USING (auth.uid() = user_id);

-- Team members can read team reviews
CREATE POLICY "team_members_read_reviews" ON reviews
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );
```

### What goes in Postgres vs Redis vs Storage

| Data | Where | Why |
|---|---|---|
| Users, teams, reviews | Postgres (Supabase) | Relational, needs transactions |
| Rate limit counters | Redis (Upstash) | Sub-ms reads, auto-expire |
| Monthly quotas | Redis (Upstash) | Auto-expire at month end |
| Idempotency keys | Redis (Upstash) | TTL-based dedup |
| PR diffs > 100KB | Supabase Storage | Avoid column size limits |
| Session cache | Supabase Auth (JWTs) | Built-in, handled for us |
| Job status (transient) | Supabase Realtime | Push, not pull |

### Why no separate backend (Express/NestJS)?

Supabase Edge Functions replace the need for:
- Express server for async processing
- Worker processes for job queues
- WebSocket server for real-time

Razorpay is the only exception — it needs a persistent Express server because Razorpay webhook verification requires the raw request body, and Vercel's edge runtime has quirks with this. Isolating it also means billing can be deployed/updated independently.

---

## OpenAI Integration: Professional Patterns

### Structured output (never parse free text)
```typescript
const completion = await openai.beta.chat.completions.parse({
  model: 'gpt-4o-mini',
  messages: [...],
  response_format: zodResponseFormat(ReviewOutputSchema, 'review'),
})
const review = completion.choices[0].message.parsed // fully typed
```

### Retry with exponential backoff
```typescript
const review = await retry(
  () => openai.beta.chat.completions.parse({ ... }),
  { retries: 3, factor: 2, minTimeout: 1000, maxTimeout: 10000 }
)
```

### Token budget management
- GPT-4o-mini: 128k context window
- PR diff capped at 3,000 lines (~15,000 tokens)
- Diffs larger than this: stored in Supabase Storage, reviewed in chunks
- Each chunk gets its own completion → findings merged

---

## Idempotency: Razorpay Webhooks

Razorpay may send the same event multiple times. Without dedup, a user gets double-upgraded.

```typescript
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  // 1. Verify signature
  const isValid = Razorpay.validateWebhookSignature(body, signature, secret)
  if (!isValid) return new Response('Unauthorized', { status: 401 })

  const event = JSON.parse(body)
  const eventId = event.payload.payment.entity.id

  // 2. Dedup via Upstash (24hr window)
  const redis = new Redis({ url: env.UPSTASH_URL, token: env.UPSTASH_TOKEN })
  const isDuplicate = await redis.set(
    `razorpay:processed:${eventId}`,
    '1',
    { nx: true, ex: 86400 } // nx = only set if not exists
  )
  if (!isDuplicate) return new Response('Already processed', { status: 200 })

  // 3. Process event
  await handlePaymentCaptured(event)
  return new Response('OK', { status: 200 })
}
```

---

## Failure Modes & Graceful Degradation

| What fails | What users see | What happens in background |
|---|---|---|
| OpenAI API down | "Review processing..." → after 5min: "Review failed, try again" | Edge Function catches error, updates status to 'failed' |
| Upstash Redis down | Rate limits not enforced (allows through), logged | Alert via Sentry, investigate post-incident |
| GitHub API 429 | Review fails with "GitHub rate limit hit" message | Retry with 60s backoff, user notified via Realtime |
| Supabase DB down | Error page (graceful, not crash) | Vercel serves error.tsx, marketing page cached by Cloudflare |
| Razorpay API down | "Payment temporarily unavailable" modal | Railway retries, no data loss |
| Edge Function timeout (>150s) | Review marked 'failed' | Triggered by Postgres deadline, user can retry |

---

## Security Checklist

- ✅ Supabase anon key only exposed to browser (low-privilege, RLS enforced)
- ✅ Service role key only in Edge Functions and Railway (never in Next.js browser bundle)
- ✅ GitHub webhook signature verified (HMAC-SHA256)
- ✅ Razorpay webhook signature verified
- ✅ All user inputs validated with Zod before any DB operation
- ✅ GitHub tokens stored encrypted in Supabase (pgcrypto)
- ✅ CORS headers locked to `devpulse.app` only
- ✅ Rate limiting on all mutating API routes
- ✅ RLS on every table — can't access other users' data even with valid JWT
- ✅ Public share links use random 16-char token (not guessable IDs)
