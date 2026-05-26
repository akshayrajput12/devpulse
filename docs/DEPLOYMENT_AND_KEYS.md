# DevPulse: Deployment, API Architecture, and Keys Guide

This document outlines everything needed to deploy DevPulse, where to find environment variables, an overview of the APIs, and how the system is designed to scale under high load.

## 1. Environment Keys and Where to Find Them

To run the Next.js app and the Payment Service, you need several keys from external providers. Here is exactly where to find them:

### Supabase (Database & Auth)
- **URL**: Go to [Supabase Dashboard](https://supabase.com/dashboard) -> Project -> Settings -> API.
- **Keys needed**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Google Gemini AI
- **URL**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Key needed**: `GEMINI_API_KEY`. (Free tier gives 1M tokens/month).

### GitHub (OAuth App & Webhooks)
- **OAuth Keys**: Go to [GitHub Developer Settings](https://github.com/settings/developers) -> OAuth Apps.
  - Needed: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- **GitHub App Keys** (For automated PR Webhooks):
  - Go to GitHub -> Settings -> Developer settings -> GitHub Apps.
  - Needed: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` (You create this secret yourself and paste it in GitHub's webhook settings).

### Upstash Redis (Rate Limiting)
- **URL**: Go to [Upstash Console](https://console.upstash.com) -> Redis -> Create Database.
- **Keys needed**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (Use the REST API credentials).

### Razorpay (Payments)
- **URL**: Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) -> Settings -> API Keys.
- **Keys needed**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (Created by you).

### Nodemailer (SMTP for Emails)
- You can use Gmail or SendGrid/AWS SES.
- **Gmail**: Go to Google Account -> Security -> 2-Step Verification -> App Passwords. Create one for "DevPulse".
- **Keys needed**: `SMTP_HOST` (e.g., `smtp.gmail.com`), `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT` (587).

---

## 2. API Overview and Routing

The system is separated into **Next.js Serverless Functions** (for frontend/API) and a **Render Node.js Service** (for long-running/webhook tasks like payments).

### Next.js APIs (Hosted on Vercel)
These are Serverless functions. They spin up instantly and scale infinitely under load.

| Route | Purpose | Scaling Strategy |
|---|---|---|
| `POST /api/reviews` | Creates a new review job. | Upstash Redis token-bucket rate limiting (<1ms). |
| `POST /api/reviews/process` | Internal endpoint. Connects to Gemini API to process the code diff. | Background execution. Chunking logic prevents hitting LLM token limits. Retry logic handles Google API failures. |
| `DELETE /api/reviews/[id]` | Deletes a review. | Row Level Security (RLS) ensures only the owner can delete. |
| `POST /api/github/webhook` | Receives PR "opened" events from GitHub App. | Immediately acknowledges GitHub, then asynchronously calls `/api/reviews/process`. |
| `POST /api/notifications/review-complete` | Sends the review complete email via Nodemailer. | Internal secret authentication ensures only our backend can trigger emails. |

### Express Payment Service (Hosted on Render.com)
Razorpay requires stable connections and strict timeout responses. Serverless functions can sometimes time out, so we use a dedicated Render process.

| Route | Purpose |
|---|---|
| `POST /razorpay/create-subscription` | Proxies order creation securely so secrets aren't exposed. |
| `POST /razorpay/webhook` | Handles subscription success/cancel events. Updates Supabase. Uses Upstash Redis for **Idempotency** (preventing duplicate processing). |

---

## 3. High Load, Scalability, and Fast Responses

To ensure the system doesn't crash under high load and remains snappy:

1. **Edge Caching (Cloudflare/Vercel)**: The marketing landing page (`/`) is fully static. It is served from Edge CDNs worldwide. Time to first byte is <50ms regardless of traffic.
2. **Sub-millisecond Rate Limiting**: Every API call goes through Upstash Redis. If a user tries to DDOS the review creation endpoint, Upstash blocks it in <1ms without touching our Supabase database.
3. **Database Scaling**: Supabase PostgreSQL uses connection pooling. All heavy analytics are offloaded to edge functions.
4. **Idempotent Webhooks**: If GitHub or Razorpay retry a webhook 5 times due to network lag, our Redis idempotency keys ensure the logic (and payment/review) only runs *exactly once*.
5. **AI Payload Chunking**: Large PR diffs are chunked. Instead of sending a 50MB file to Gemini (which would timeout), we chunk it based on file boundaries and process them concurrently.

---

## 4. How to Host & Deploy

### A. Frontend & Core API (Vercel)
1. Push the repository to GitHub.
2. Go to Vercel.com -> Add New Project -> Import the GitHub repo.
3. In Environment Variables, copy everything from `.env.example`.
4. Click Deploy. Vercel automatically handles Next.js scaling.

### B. Payment Service (Render.com)
1. Go to Render.com -> New Web Service.
2. Connect the GitHub repo.
3. Set Build Command: `npm install && npm run build` (Inside the `src/payment-service` folder).
4. Set Start Command: `node dist/app.js`.
5. Add the variables from `.env.render.example`.

### C. Database (Supabase)
1. Go to Supabase -> SQL Editor.
2. Copy and run the files in `supabase/migrations/` sequentially:
   - `20250101000001_init.sql`
   - `20250101000002_rls.sql`
   - `20250101000003_realtime.sql`

---

## 5. Troubleshooting & Fixing Bugs

If something breaks, here is how to track it down:

1. **"Missing Env Var" / Internal Server Error on API call**:
   - Check the Vercel logs. If `GEMINI_API_KEY` is missing, the `/api/reviews/process` endpoint will 500.
2. **Realtime updates not working on the dashboard**:
   - Check if `20250101000003_realtime.sql` was executed in Supabase. Realtime must be explicitly enabled for the `reviews` table.
3. **Payment succeeds but plan doesn't upgrade**:
   - Check Render logs. Ensure `RAZORPAY_WEBHOOK_SECRET` matches exactly what is in the Razorpay dashboard. If the HMAC signature fails, Render will reject the webhook with a 401.
4. **Emails not sending**:
   - Ensure you are using an App Password for Gmail (`SMTP_PASS`), not your actual account password. Ensure `SMTP_PORT` is 587.
