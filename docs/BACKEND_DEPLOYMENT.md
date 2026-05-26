# Backend Deployment

DevPulse keeps Gemini, SMTP, GitHub fetching, and production logging in `src/backend`. The UI can run same-origin with TanStack Start server functions, or call a separate Render backend through `VITE_BACKEND_URL`.

## Local

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY`, Supabase keys, and SMTP values.
3. Run:

```bash
npm run dev
```

Do not create `VITE_GEMINI_*` variables. Anything prefixed with `VITE_` can be exposed to the browser.

## API Folders

- `api/ssr.js` is the Vercel SSR adapter. Keep it for Vercel deployments.
- `src/routes/api/*` contains real HTTP routes. Keep only routes that must be callable over HTTP, such as GitHub webhooks and cross-origin backend calls.
- `src/backend/*` contains the actual backend implementation. Routes and server functions should import from here instead of holding business logic.

## Render Free Hosting

Use Render Web Service for the backend/full app:

- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Environment:
  - `APP_URL=https://your-render-service.onrender.com`
  - `VITE_APP_URL=https://your-render-service.onrender.com`
  - `CORS_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com`
  - `GEMINI_API_KEY`
  - `GEMINI_TRIAGE_MODEL`
  - `GEMINI_REVIEW_MODEL`
  - `GEMINI_ENTERPRISE_MODEL`
  - `SUPABASE_URL`
  - `VITE_SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Render free services may sleep after inactivity. For always-on production, Railway/Fly.io are usually smoother, but Render is fine for testing.

## Vercel Frontend + Render Backend

Set these on Vercel:

- `VITE_BACKEND_URL=https://your-render-service.onrender.com`
- `VITE_APP_URL=https://your-frontend.vercel.app`
- Supabase public env vars

Set these on Render:

- All backend secrets: `GEMINI_API_KEY`, SMTP vars, Supabase service role key
- `APP_URL=https://your-frontend.vercel.app`
- `CORS_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com`

For the simplest production setup, deploy the full TanStack app on Vercel and leave `VITE_BACKEND_URL` empty. For split hosting, the review page posts to `POST /api/reviews/process` on Render with the user's Supabase bearer token.

## Production Logs

Backend logs are JSON lines with `requestId`, `reviewId`, user id/email when available, model name, HTTP status, token usage (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`), findings count, and error details. Search by `requestId` to follow one review end to end.

Common failures:

- `GEMINI_API_KEY is not configured`: set the backend env var.
- `Gemini API error 429`: model rate limit; retry later or use a higher quota key.
- `SMTP is not configured`: set SMTP env vars. For Gmail, use an app password.
- `GitHub PR fetch failed`: user token is missing/expired or the repo is private without access.
