import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { z } from "zod";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load Environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from backend folder `.env`
dotenv.config();

// Try loading env vars manually if dotenv fails in some environments
const envPath = join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index > 0) {
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

import { getRequiredEnv, getRuntimeEnv } from "./backend/config/env.server.js";
import { processReviewBackend } from "./backend/reviews/review-processor.server.js";
import * as blogFunctions from "./functions/blog.js";
import * as folderAnalysisFunctions from "./functions/folder-analysis.js";
import * as reviewFunctions from "./functions/reviews.js";
import * as adminFunctions from "./functions/admin.js";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// Setup dynamic CORS origins
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS];
const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
allowedOrigins.push(...configuredOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Fallback: allow, but log a warning
        console.warn(`[CORS Warning] Origin "${origin}" is not explicitly allowed, but allowing for dev compatibility.`);
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Pre-flight handler
app.options("*", cors());

// Helper to catch errors in Express async handlers
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── 1. GitHub Webhook Route ─────────────────────────────────
function verifyGithubWebhook(secret: string, body: string, sig: string | null) {
  if (!sig?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post(
  "/api/public/github/webhook",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const secret = getRuntimeEnv("GITHUB_APP_WEBHOOK_SECRET");
    const event = req.headers["x-github-event"] as string || "";
    const sig = req.headers["x-hub-signature-256"] as string || null;
    const bodyStr = JSON.stringify(req.body);

    if (secret && !verifyGithubWebhook(secret, bodyStr, sig)) {
      return res.status(401).send("Invalid signature");
    }

    const payload = req.body;
    const sb = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // Installation lifecycle
    if (event === "installation") {
      if (payload.action === "created" || payload.action === "new_permissions_accepted") {
        const installerLogin = payload.installation?.account?.login;
        const installerId = payload.installation?.id;
        await sb.from("github_installations").upsert({
          user_id: null,
          installation_id: installerId,
          account_login: installerLogin,
          account_type: payload.installation?.account?.type,
          repository_selection: payload.installation?.repository_selection,
        } as any, { onConflict: "installation_id" });
      }
      return res.send("ok");
    }

    // PR opened / synchronize → auto review
    if (event === "pull_request" && ["opened", "reopened", "synchronize"].includes(payload.action)) {
      const pr = payload.pull_request;
      const installId = payload.installation?.id;
      const prUrl = pr.html_url as string;

      const { data: inst } = await sb.from("github_installations")
        .select("user_id").eq("installation_id", installId).maybeSingle();
      const userId = inst?.user_id ?? null;
      if (!userId) {
        await sb.from("review_events").insert({
          installation_id: installId,
          pr_url: prUrl,
          event_type: event,
          status: "unclaimed",
          payload: payload as any,
        });
        return res.send("queued-unclaimed");
      }

      const shareToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { data: review } = await sb.from("reviews").insert({
        user_id: userId,
        pr_url: prUrl,
        status: "pending",
        share_token: shareToken,
      }).select().single();

      await sb.from("review_events").insert({
        user_id: userId,
        installation_id: installId,
        pr_url: prUrl,
        event_type: event,
        review_id: review?.id,
        status: "queued",
      });

      if (review) {
        await reviewFunctions.enqueueAndRun(review.id, null);
      }
      return res.send("queued");
    }

    return res.send("ignored");
  })
);

// ─── 2. Original reviews.process route ───────────────────────
const ReviewsProcessSchema = z.object({
  review_id: z.string().uuid(),
});

app.post(
  "/api/reviews/process",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = ReviewsProcessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // Run the background process review asynchronously
    processReviewBackend({
      reviewId: parsed.data.review_id,
      accessToken: auth.slice(7),
    }).catch((error) => {
      console.error("[api/reviews/process] Background review error:", error instanceof Error ? error.message : error);
    });

    return res.json({ ok: true, queued: true, reviewId: parsed.data.review_id });
  })
);

// ─── 2.5. Indian Pricing & Razorpay Payment Endpoints ────────
app.get(
  "/api/pricing/plans",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const sb = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
      { auth: { persistSession: false } }
    );
    const { data, error } = await sb
      .from("pricing_plans")
      .select("*")
      .order("price_monthly", { ascending: true });

    if (error) {
      console.error("[GET /api/pricing/plans] Error fetching pricing plans:", error.message);
      return res.status(500).json({ error: "Failed to fetch pricing plans" });
    }

    return res.json(data);
  })
);

app.post(
  "/api/pricing/razorpay/checkout",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.slice(7);
    const uc = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData, error: uErr } = await uc.auth.getUser();
    if (uErr || !userData.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const schema = z.object({
      billingCycle: z.enum(["monthly", "annual"]),
    });
    const parsed = schema.parse(req.body);
    const { billingCycle } = parsed;

    // Prices in Paise (INR * 100)
    // Monthly: ₹999/mo -> 99900 Paise
    // Annual: ₹799/mo (billed annually) -> 799 * 12 = 9588 * 100 = 958800 Paise
    const amount = billingCycle === "annual" ? 958800 : 99900;
    const keyId = getRuntimeEnv("RAZORPAY_KEY_ID");
    const keySecret = getRuntimeEnv("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      console.error("[Razorpay Checkout] Razorpay API credentials are not configured in environment variables.");
      return res.status(500).json({ error: "Payment gateway credentials are not configured." });
    }

    const receipt = `rcpt_${userData.user.id.slice(0, 8)}_${Date.now()}`;
    const authStr = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    try {
      // Standard Razorpay Order Request via direct HTTPS call (completely secure and lightweight)
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authStr}`,
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt,
          notes: {
            userId: userData.user.id,
            planId: "pro",
            billingCycle,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Razorpay Checkout] Failed to create order in Razorpay:", errText);
        return res.status(500).json({ error: "Failed to initialize payment gateway." });
      }

      const orderData: any = await response.json();
      return res.json({
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
      });
    } catch (err: any) {
      console.error("[Razorpay Checkout] Direct API request failed:", err.message);
      return res.status(500).json({ error: "Failed to connect to payment gateway." });
    }
  })
);

app.post(
  "/api/pricing/razorpay/verify",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.slice(7);
    const uc = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData, error: uErr } = await uc.auth.getUser();
    if (uErr || !userData.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const schema = z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
      billingCycle: z.enum(["monthly", "annual"]),
    });

    const parsed = schema.parse(req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billingCycle } = parsed;

    const keySecret = getRuntimeEnv("RAZORPAY_KEY_SECRET") || "";
    if (!keySecret) {
      return res.status(500).json({ error: "Payment verification failed: secret key not configured." });
    }

    // Verify cryptographic signature: orderId + "|" + paymentId signed with Key Secret
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("[Razorpay Verification] Invalid payment signature.");
      return res.status(400).json({ error: "Invalid payment signature verification." });
    }

    // Connect to Supabase via admin client to run RPC and bypass user-only RLS update boundaries
    const sb = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // Cost Safeguard: Prevent double upgrade processing (verify vs webhook race condition)
    const { data: existingTx, error: txErr } = await sb
      .from("payment_transactions")
      .select("id")
      .eq("id", razorpay_payment_id)
      .maybeSingle();

    if (txErr) {
      console.error("[Razorpay Verification] Failed to query payment transactions:", txErr.message);
      return res.status(500).json({ error: "Failed to record transaction history." });
    }

    if (existingTx) {
      console.info(`[Razorpay Verification] Payment transaction ${razorpay_payment_id} already logged. Upgraded cleanly.`);
      return res.json({ success: true, plan: "pro", alreadyProcessed: true });
    }

    const amount = billingCycle === "annual" ? 958800 : 99900;
    
    // Log transaction to database securely
    const { error: logErr } = await sb.from("payment_transactions").insert({
      id: razorpay_payment_id,
      order_id: razorpay_order_id,
      user_id: userData.user.id,
      amount,
      billing_cycle: billingCycle,
    });

    if (logErr) {
      console.error("[Razorpay Verification] Failed to log transaction in database:", logErr.message);
      return res.status(500).json({ error: "Failed to record transaction history." });
    }

    // Dynamic plan duration: Pro monthly is 30 days, Pro annual is 365 days
    const durationDays = billingCycle === "annual" ? 365 : 30;

    const { error: upgradeErr } = await sb.rpc("upgrade_user_plan", {
      p_user_id: userData.user.id,
      p_plan: "pro",
      p_duration_days: durationDays,
    });

    if (upgradeErr) {
      console.error("[Razorpay Verification] Database upgrade RPC failed:", upgradeErr.message);
      return res.status(500).json({ error: "Signature verified but failed to update subscription." });
    }

    console.info(`[Razorpay Verification] Successfully upgraded user ${userData.user.id} to Developer Pro!`);
    return res.json({ success: true, plan: "pro" });
  })
);

app.post(
  "/api/pricing/razorpay/webhook",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = getRuntimeEnv("RAZORPAY_WEBHOOK_SECRET");

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac("sha256", webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest("hex");
      if (digest !== signature) {
        console.error("[Razorpay Webhook] Invalid webhook signature.");
        return res.status(400).send("Invalid signature");
      }
    }

    const payload = req.body;
    const event = payload.event;

    let paymentId = "";
    let orderId = "";
    let userId = "";
    let billingCycle = "monthly";
    let amount = 0;

    if (event === "order.paid") {
      const orderEntity = payload.payload?.order?.entity;
      orderId = orderEntity?.id || "";
      userId = orderEntity?.notes?.userId;
      billingCycle = orderEntity?.notes?.billingCycle || "monthly";
      amount = orderEntity?.amount || 0;
      
      const payments = payload.payload?.payments || [];
      if (payments.length > 0) {
        paymentId = payments[0]?.entity?.id || "";
      }
    } else if (event === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      paymentId = paymentEntity?.id || "";
      orderId = paymentEntity?.order_id || "";
      userId = paymentEntity?.notes?.userId;
      billingCycle = paymentEntity?.notes?.billingCycle || "monthly";
      amount = paymentEntity?.amount || 0;
    }

    if (userId && paymentId) {
      const sb = createClient(
        getRequiredEnv("SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { persistSession: false } }
      );

      // Check if payment already processed
      const { data: existingTx } = await sb
        .from("payment_transactions")
        .select("id")
        .eq("id", paymentId)
        .maybeSingle();

      if (existingTx) {
        console.info(`[Razorpay Webhook] Payment transaction ${paymentId} already processed. Skipping duplicate upgrade.`);
        return res.send("ok");
      }

      // Record transaction securely
      await sb.from("payment_transactions").insert({
        id: paymentId,
        order_id: orderId,
        user_id: userId,
        amount,
        billing_cycle: billingCycle,
      });

      const durationDays = billingCycle === "annual" ? 365 : 30;
      const { error: upgradeErr } = await sb.rpc("upgrade_user_plan", {
        p_user_id: userId,
        p_plan: "pro",
        p_duration_days: durationDays,
      });

      if (upgradeErr) {
        console.error("[Razorpay Webhook] Failed to process webhook database upgrade:", upgradeErr.message);
        return res.status(500).send("Database upgrade failed");
      }
      console.info(`[Razorpay Webhook] Successfully processed redundant payment upgrade for user ${userId}, payment: ${paymentId}`);
    }

    return res.send("ok");
  })
);

// ─── 3. Blog Endpoints ────────────────────────────────────────
app.get(
  "/api/blog/posts",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const posts = await blogFunctions.getPublishedBlogPosts();
    return res.json(posts);
  })
);

app.post(
  "/api/blog/post-by-slug",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ slug: z.string() });
    const parsed = schema.parse(req.body);
    const post = await blogFunctions.getBlogPostBySlug(parsed.slug);
    return res.json(post);
  })
);

// ─── 4. Folder Analysis Endpoints ────────────────────────────
app.post(
  "/api/folder-analysis/analyze",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      repo_full_name: z.string().min(1),
      file_tree: z.array(z.object({ path: z.string(), type: z.string() })),
    });
    const parsed = schema.parse(req.body);
    const result = await folderAnalysisFunctions.analyzeFolderStructure(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/folder-analysis/save",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      repo_owner: z.string(),
      repo_name: z.string(),
      repo_full_name: z.string(),
      result: z.any(),
      file_tree: z.array(z.object({ path: z.string(), type: z.string() })),
    });
    const parsed = schema.parse(req.body);
    const result = await folderAnalysisFunctions.saveFolderAnalysis(parsed as any);
    return res.json(result);
  })
);

app.post(
  "/api/folder-analysis/get",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      id: z.string().uuid(),
      access_token: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = await folderAnalysisFunctions.getFolderAnalysis(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/folder-analysis/get-by-token",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await folderAnalysisFunctions.getFolderAnalysisByToken(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/folder-analysis/list",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      limit: z.number().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = await folderAnalysisFunctions.listFolderAnalyses(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/folder-analysis/delete",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      id: z.string().uuid(),
      access_token: z.string().min(10),
    });
    const parsed = schema.parse(req.body);
    const result = await folderAnalysisFunctions.deleteFolderAnalysis(parsed);
    return res.json(result);
  })
);

// ─── 5. Reviews Endpoints ────────────────────────────────────
app.post(
  "/api/reviews/process-review",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      review_id: z.string().uuid(),
      access_token: z.string().min(10),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.processReview(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/create",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      pr_url: z.string().url().regex(/github\.com\/[^/]+\/[^/]+(\/pull\/\d+|\/workspace)/),
      access_token: z.string().min(10),
      user_id: z.string().uuid(),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.createReview(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/retry",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      review_id: z.string().uuid(),
      access_token: z.string().min(10),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.retryReview(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/user-repos",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ access_token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.getUserRepos(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/pr-pulls",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      owner: z.string(),
      repo: z.string(),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.getRepoPullRequests(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/git-tree",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      owner: z.string(),
      repo: z.string(),
      access_token: z.string(),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.getRepoGitTree(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/apply-fix",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      review_id: z.string().uuid(),
      finding_id: z.string().uuid(),
      access_token: z.string().min(10),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.applyFindingFix(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/post-styled",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      review_id: z.string().uuid(),
      access_token: z.string().min(10),
      style: z.enum(["devpulse", "human"]),
      reviewer_name: z.string().default(""),
      reviewer_login: z.string().default(""),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.postReviewStyled(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/email-report",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      review_id: z.string().uuid(),
      email: z.string().email(),
      access_token: z.string().min(10),
    });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.emailReviewReport(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/reviews/user-profile",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ access_token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await reviewFunctions.getUserProfileData(parsed);
    return res.json(result);
  })
);

// ─── 6. Admin Endpoints ──────────────────────────────────────
app.post(
  "/api/admin/check-status",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ access_token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.checkAdminStatus(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/metrics",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ access_token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.getAdminMetrics(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/users",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      search: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.getAdminUsers(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/update-credits",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      user_id: z.string().uuid(),
      credits: z.number().int().nonnegative(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.updateAdminUserCredits(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/update-plan",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      user_id: z.string().uuid(),
      plan: z.enum(["free", "pro"]),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.updateAdminUserPlan(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/toggle-role",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      user_id: z.string().uuid(),
      is_admin: z.boolean(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.toggleAdminRole(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/toggle-block",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      user_id: z.string().uuid(),
      is_blocked: z.boolean(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.toggleAdminUserBlock(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/delete-user",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      user_id: z.string().uuid(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.deleteAdminUserAccount(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/blog-posts",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ access_token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.getAdminBlogPosts(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/save-blog-post",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      id: z.string().uuid().optional(),
      slug: z.string().min(2),
      title: z.string().min(3),
      excerpt: z.string(),
      content: z.string().min(10),
      cover_image_url: z.string().optional(),
      published: z.boolean(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.saveAdminBlogPost(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/delete-blog-post",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      id: z.string().uuid(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.deleteAdminBlogPost(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/settings",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({ access_token: z.string().min(10) });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.getAdminSettings(parsed);
    return res.json(result);
  })
);

app.post(
  "/api/admin/update-settings",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const schema = z.object({
      access_token: z.string().min(10),
      ai_provider: z.enum(["gemini", "openai", "both"]).optional(),
      parallel_engine_enabled: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = await adminFunctions.updateAdminSettings(parsed);
    return res.json(result);
  })
);


// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isNetworkTimeout = 
    err.message?.includes("fetch failed") || 
    err.code === "UND_ERR_CONNECT_TIMEOUT" || 
    err.code === "ETIMEDOUT" || 
    err.code === "ENOTFOUND" || 
    err.code === "ECONNREFUSED" ||
    String(err).includes("ConnectTimeoutError") ||
    String(err).includes("undici");

  if (isNetworkTimeout) {
    console.warn(`\x1b[33m[Supabase Network Error]\x1b[0m Failed to reach Supabase API (${err.message || err.code || "Connection Timeout"}). Server remains fully operational.`);
    return res.status(503).json({
      error: "Authentication server is temporarily unreachable. Please check your network connection.",
    });
  }

  // Handle expected unauthorized session expiration warning cleanly
  if (err.message === "Unauthorized") {
    console.warn(`\x1b[33m[Auth Warning]\x1b[0m Unauthorized access request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.error("[Global Error Handler]", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  return res.status(status).json({ error: message });
});

// Health Check Endpoint (Lightweight status check for CDNs and pingers)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[Server] Express API server running on http://localhost:${PORT}`);
  console.log(`[Server] Dynamic CORS configured for frontend at: ${allowedOrigins.join(", ")}`);
  
  // Render Free Tier Keep-Alive pinger
  const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (RENDER_EXTERNAL_URL) {
    const pingerInterval = 10 * 60 * 1000; // 10 minutes (spins down after 15m)
    setInterval(() => {
      fetch(`${RENDER_EXTERNAL_URL}/health`)
        .then(res => {
          console.log(`[Keep-Alive] Self-ping status: ${res.status} at ${new Date().toISOString()}`);
        })
        .catch(err => {
          console.error(`[Keep-Alive] Self-ping failed:`, err instanceof Error ? err.message : String(err));
        });
    }, pingerInterval);
    console.log(`[Keep-Alive] Configured active self-pinger to: ${RENDER_EXTERNAL_URL}/health`);
  }
});
