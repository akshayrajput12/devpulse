# DevPulse — Render Logs Integration Guide

This document outlines the step-by-step method to pull, stream, and display live production logs from your **Render** deployment directly into the **DevPulse Admin Panel**!

---

## 💡 How It Works
Render offers two primary methods to read logs programmatically:
1. **Render API (REST):** Querying Render’s `/services/{service_id}/logs` endpoint dynamically.
2. **Log Streams (Syslog/HTTPS Webhook):** Stream logs in real-time to a third-party destination.

The **Log Streams (Webhook) approach** is the most professional, lightweight, and real-time. We will set up a dedicated endpoint in the backend (`/api/admin/logs/webhook`) that receives these real-time log payloads, stores them in a database table or high-speed Redis queue, and serves them to your Admin Dashboard via a clean API.

---

## 🚀 Step-by-Step Implementation Guide

### Step 1: Create a Database Table for Logs
Run this SQL inside your **Supabase SQL Editor** to establish a high-performance log repository:

```sql
-- Create render logs table
CREATE TABLE public.render_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT NOT NULL,
    environment TEXT DEFAULT 'production',
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.render_logs ENABLE ROW LEVEL SECURITY;

-- Allow only system admins to view logs
CREATE POLICY "admin_only_logs" ON public.render_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create index on timestamp for fast dashboard lookups
CREATE INDEX IF NOT EXISTS idx_render_logs_timestamp ON public.render_logs(timestamp DESC);
```

---

### Step 2: Implement the Webhook Endpoint in Backend
In your backend (`backend/src/server.ts`), add a high-speed route to catch the incoming Render Log webhook payloads.

```typescript
// Add log ingestion schema
const RenderLogSchema = z.object({
  serviceId: z.string(),
  logs: z.array(z.object({
    timestamp: z.string(),
    text: z.string(),
  }))
});

app.post(
  "/api/public/render/logs-webhook",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    // 1. Verify webhook header secret (Security Token set by you on Render)
    const token = req.headers["x-render-log-secret"];
    const expectedToken = getRuntimeEnv("RENDER_LOG_SECRET");
    
    if (expectedToken && token !== expectedToken) {
      return res.status(401).send("Unauthorized");
    }

    const payload = req.body;
    const sb = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // 2. Format and insert logs in a single fast DB transaction
    const logsToInsert = (payload.logs || []).map((l: any) => ({
      service_id: payload.serviceId || "devpulse-backend",
      message: l.text,
      timestamp: l.timestamp || new Date().toISOString(),
      severity: l.text.toLowerCase().includes("error") ? "error" : "info"
    }));

    if (logsToInsert.length) {
      await sb.from("render_logs").insert(logsToInsert);
    }

    return res.send("ok");
  })
);
```

---

### Step 3: Configure Log Streaming in Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Go to **Account Settings** (or Team Settings) → **Log Streams**.
3. Click **Add Log Stream**.
4. **Choose Destination:** Select **Logtail / Better Stack** or use a **Custom HTTPS endpoint**.
   - Set **URL** to: `https://your-backend.onrender.com/api/public/render/logs-webhook`
   - Set **Secret Token** (e.g. `your-super-secret-token`) to secure the endpoint.
5. Save. Render will now start streaming all deployment and server console output (`console.log`, `console.error`) instantly to your database!

---

### Step 4: Create Admin Logs Endpoint
Add an API route in `backend/src/server.ts` to allow admins to query logs with pagination:

```typescript
app.post(
  "/api/admin/logs",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      limit: z.number().optional().default(50),
    });
    const parsed = schema.parse(req.body);
    
    // Verify admin privileges
    const isAdmin = await verifyAdmin(parsed.access_token);
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });

    const sb = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const { data: logs, error } = await sb
      .from("render_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(parsed.limit);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(logs);
  })
);
```

---

### Step 5: Render Logs on Your Admin Dashboard UI
In your React Admin panel (`frontend/src/routes/admin.tsx` or similar), add a tab to query logs:

```typescript
// Fetch logs handler
const fetchLogs = async () => {
  const response = await fetchApi("/api/admin/logs", {
    method: "POST",
    body: JSON.stringify({ access_token: session.access_token, limit: 100 }),
  });
  setLogs(response);
};
```

Render them inside a brutalist, scrolling dark-mode terminal window with auto-refresh!

```tsx
<div className="rounded-xl border border-border bg-[#09090b] p-5 font-mono text-xs text-text-muted space-y-2 h-96 overflow-y-auto">
  {logs.map(log => (
    <div key={log.id} className="flex gap-2">
      <span className="text-text-faint">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
      <span className={log.severity === 'error' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
        [{log.severity.toUpperCase()}]
      </span>
      <span className="text-foreground select-text">{log.message}</span>
    </div>
  ))}
</div>
```

By completing these steps, your Render server logs will stream into your admin dashboard in real-time, giving you central observability at zero third-party cost!
