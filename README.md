# DevPulse — AI Code Reviews That Actually Ship

AI-powered code reviews across 6 production-grade categories. Paste a GitHub PR URL and get a severity-ranked, line-by-line review with complete fix suggestions in under 10 seconds.

## Features

- **PR Review** — Full diff analysis with severity ranking (crit → high → med → low)
- **Codebase Audit** — Deep-scan up to 30 files across your entire repo
- **6 Review Categories** — Security, Performance, Architecture, Reliability, Testability, Readability
- **GitHub Integration** — Post reviews directly to PRs with inline suggestion code fences (one-click "Apply suggestion" in GitHub UI)
- **Direct Fix Commits** — Apply suggested fixes straight to the PR branch from the app
- **PDF Export** — Export the full report with all tabs and findings
- **Two Posting Styles** — Post as DevPulse AI (professional) or as yourself (humanized, signed with your name)
- **Deterministic Reviews** — `temperature: 0` ensures the same diff always produces the same output

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) (React SSR, Vite 7) |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Realtime) |
| AI Model | Google Gemini 2.5 Flash |
| Auth | Supabase Auth (GitHub OAuth) |
| Styling | Tailwind CSS v4, Radix UI, Framer Motion |
| Deployment | Vercel (SSR via Serverless Functions) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)
- A GitHub OAuth App (for GitHub login + PR access)

### Environment Variables

Create a `.env` file in the root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
GEMINI_API_KEY=your-gemini-api-key
APP_URL=http://localhost:5173
VITE_APP_URL=http://localhost:5173
VITE_BACKEND_URL=
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-app-password
SMTP_FROM="DevPulse <no-reply@your-domain.com>"
```

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

## Deployment (Vercel)

The project is pre-configured for Vercel SSR via `vercel.json`.

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Deploy

How it works:
- `dist/client/` — static assets (JS, CSS) served from Vercel's CDN edge
- `dist/server/` — SSR handler wrapped as a Vercel Serverless Function (`api/ssr.js`)
- Static assets are served directly; all other routes go through the SSR function

## Database Schema

Run in your Supabase SQL editor:

```sql
create table profiles (
  id uuid references auth.users primary key,
  email text,
  plan text default 'free',
  reviews_used_this_month int default 0,
  github_token text,
  created_at timestamptz default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  repo text,
  pr_number int,
  pr_url text,
  status text default 'pending',
  health_score int,
  summary text,
  error_message text,
  created_at timestamptz default now()
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade,
  severity text,
  category text,
  title text,
  description text,
  file_path text,
  line_start int,
  line_end int,
  bad_code text,
  suggested_fix text,
  confidence int,
  created_at timestamptz default now()
);
```

## Plan Limits

| Plan | Reviews/month |
|------|-------------|
| Free | 10 |
| Pro | 100 |
| Team | 500 |

## License

Private — all rights reserved.
