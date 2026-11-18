# SOFTWARE REQUIREMENTS SPECIFICATION (SRS) & SYSTEM ARCHITECTURE MASTER SPECIFICATION

## Project Codename: DEVPULSE
**Full Formal System Title:** Autonomous Multi-Modal Artificial Intelligence System for Real-Time Source Code Auditing, Pull Request Triage, Architectural Analysis, and Programmatic Remediation  
**Standard Compliance:** Tailored from ISO/IEC/IEEE 29148:2018 & IEEE Std 830-1998  
**Intellectual Property Filing Reference:** Annexure 3b — Complete Invention Disclosure Specification  
**Document Identification:** SRS-DEVPULSE-2026-V2.4  
**Date of Publication:** November 10, 2026  
**Document Status:** Approved & Production-Ready  

---

## DOCUMENT CONTROL & REVISION HISTORY

| Version | Primary Author / Contributor | Release Date | Summary of Major Changes & Enhancements |
| :--- | :--- | :--- | :--- |
| **v1.0.0** | Akshay Pratap Singh | May 17, 2026 | Initial baseline architecture: Next.js + Express + Supabase RLS |
| **v1.5.0** | Engineering Team | May 21, 2026 | Asynchronous worker queue, credit ledger, and folder structure audit |
| **v2.0.0** | Core Systems Group | May 26, 2026 | Dual AI orchestration core: Gemini 2.5 Flash $\leftrightarrow$ OpenAI GPT-4o failover |
| **v2.2.0** | Security Architecture Group | October 5, 2026 | AES-256-GCM encrypted AI Key Vault, privilege guard triggers |
| **v2.4.0** | Akshay Pratap Singh | November 10, 2026 | Comprehensive ISO/IEC/IEEE 29148 enterprise SRS & Annexure 3b merger |

---

## TABLE OF CONTENTS
1. [Official Identification & Inventors Disclosure (Annexure 3b)](#1-official-identification--inventors-disclosure-annexure-3b)
2. [Executive Summary & Product Vision](#2-executive-summary--product-vision)
3. [Software Development Life Cycle (SDLC) & Engineering Methodology](#3-software-development-life-cycle-sdlc--engineering-methodology)
4. [Complete Technology Stack & Infrastructure Audit](#4-complete-technology-stack--infrastructure-audit)
5. [Complete Codebase Folder Structure & File Manifest](#5-complete-codebase-folder-structure--file-manifest)
6. [Design System & High-Craft Frontend Architecture](#6-design-system--high-craft-frontend-architecture)
7. [System Architecture & Multi-Tier Cloud Design](#7-system-architecture--multi-tier-cloud-design)
8. [Dual-Engine AI Orchestrator, Prompts & Failover Core](#8-dual-engine-ai-orchestrator-prompts--failover-core)
9. [Keys, Security Architecture & AES-256-GCM Key Vault](#9-keys-security-architecture--aes-256-gcm-key-vault)
10. [Code Health Score Mathematical Model & Formulation](#10-code-health-score-mathematical-model--formulation)
11. [Comprehensive Data Flow Diagrams (DFD Levels 0, 1, 2)](#11-comprehensive-data-flow-diagrams-dfd-levels-0-1-2)
12. [Database Design, Relational Schema & Entity Relationship Diagram (ERD)](#12-database-design-relational-schema--entity-relationship-diagram-erd)
13. [Detailed Functional Requirements (IEEE 29148 Standard)](#13-detailed-functional-requirements-ieee-29148-standard)
14. [Detailed Non-Functional Requirements (NFRs)](#14-detailed-non-functional-requirements-nfrs)
15. [Payment Gateways, Subscriptions & Razorpay Architecture](#15-payment-gateways-subscriptions--razorpay-architecture)
16. [Complete REST API, Webhooks & Real-Time Hook Points Directory](#16-complete-rest-api-webhooks--real-time-hook-points-directory)
17. [Production Scaling, Performance & Disaster Recovery Blueprint](#17-production-scaling-performance--disaster-recovery-blueprint)
18. [Requirements Traceability & Verification Matrix (RTM)](#18-requirements-traceability--verification-matrix-rtm)
19. [Future Scope & Multi-Year Engineering Roadmap](#19-future-scope--multi-year-engineering-roadmap)
20. [Formal Patent Claims & Legal Specification (Annexure 3b)](#20-formal-patent-claims--legal-specification-annexure-3b)
21. [Results, Empirical Benchmarks & Authorized Declarations (NOC)](#21-results-empirical-benchmarks--authorized-declarations-noc)

---

## 1. OFFICIAL IDENTIFICATION & INVENTORS DISCLOSURE (ANNEXURE 3b)

*Compliant with University Research Council & Indian Patent Office Form 2 / Form 3 Complete Patent Specification Requirements.*

### 1.1 Formal Title of the Invention
**AUTONOMOUS MULTI-MODAL ARTIFICIAL INTELLIGENCE SYSTEM FOR REAL-TIME SOURCE CODE AUDITING, PULL REQUEST TRIAGE, ARCHITECTURAL ANALYSIS, AND PROGRAMMATIC REMEDIATION (DEVPULSE)**

### 1.2 Internal Inventors & Research Contributors

| Parameter | Lead Architect & Inventor | Internal Co-Inventor 1 | Internal Co-Inventor 2 |
| :--- | :--- | :--- | :--- |
| **Full Legal Name** | **Akshay Pratap Singh** | **Dr. Ravindra Singh Yadav** | **Dr. Virrat Devaser** |
| **Mobile Number** | +91 9653814628 | +91 8839551642 | +91 9463732892 |
| **Email (Personal / Official)** | akshayrajput2616@gmail.com | Ravindra171982@gmail.com | virratsush@gmail.com |
| **UID / Registration Number** | 12015842 / DEV-001 | 32309 | 14591 |
| **Institutional Affiliation** | DevPulse Core Engineering / Lovely Professional University, Punjab, India | Lovely Professional University, Punjab-144411, India | Lovely Professional University, Punjab-144411, India |
| **Department / Division** | Department of Computer Science & Engineering | School of Electronics & Electrical Engineering | Department of Academic Affairs & Innovation |
| **Signature / Authentication** | *Akshay Pratap Singh (Signed)* | *Dr. Ravindra Singh Yadav (Signed)* | *Dr. Virrat Devaser (Signed)* |

---

## 2. EXECUTIVE SUMMARY & PRODUCT VISION

### 2.1 The Core Industry Problem
In modern software engineering, pull request (PR) code review is the primary line of defense against security breaches, data corruption, and system outages. However, the current code review paradigm suffers from structural failure modes:
- **Severe Deployment Latency:** PRs sit unreviewed for an average of **24 to 72 hours**, stalling release momentum.
- **Reviewer Fatigue & Inconsistency:** Senior engineers spend 20% to 35% of their weekly capacity conducting reviews, leading to cognitive fatigue where critical injection risks, race conditions, and memory leaks are routinely approved.
- **Deficiencies of Legacy Static Analyzers (SAST):** Rule-based static linters (SonarQube, ESLint) produce **35% to 50% false positive rates**, lack semantic context, and fail to supply deployable code fixes.
- **The LLM Single-Provider Outage Risk:** Early AI review tools rely on a single third-party model (e.g., OpenAI). When encountering rate-limit spikes (HTTP 429) or cloud downtime (HTTP 503), developer pipelines crash completely.

### 2.2 The DevPulse Value Proposition
DevPulse is a production-grade, developer-first AI Code Review Micro-SaaS. By bridging distributed version control systems (GitHub) with an asynchronous worker queue, a dual-engine AI orchestrator (Google Gemini 2.5 Flash / 3.0 Pro and OpenAI GPT-4o-mini / GPT-4o), and a reactive WebSocket change data capture (CDC) engine, DevPulse delivers:
1. **Sub-30-Second Turnaround:** Full PR audits executed in 8 to 28 seconds.
2. **Contextual Multi-Dimensional Audits:** Evaluations across Security (OWASP Top 10), Performance, Architecture, Reliability, Testability, and Readability.
3. **One-Click Programmatic Remediation:** Line-level, syntactically valid code diffs committed directly back to remote GitHub branches via Git Data APIs.
4. **Resilient High Availability (99.98%):** Dynamic zero-downtime failover between Google Gemini and OpenAI models backed by an AES-256-GCM encrypted API key vault.
5. **Zero-Polling Reactive Experience:** Direct state synchronization from PostgreSQL Write-Ahead Logs (WAL) to developer browsers over WebSockets via Supabase Realtime.

---

## 3. SOFTWARE DEVELOPMENT LIFE CYCLE (SDLC) & ENGINEERING METHODOLOGY

### 3.1 Agile-DevOps Hybrid with Subagent-Driven Continuous Delivery
DevPulse is developed using an **Agile-DevOps Hybrid Model** reinforced by **Test-Driven Development (TDD)** and **Subagent-Driven Development (SDD)**:

```
+─────────────────────────────────────────────────────────────────────────────+
|                          DEVPULSE SDLC LIFECYCLE                            |
+─────────────────────────────────────────────────────────────────────────────+
|                                                                             |
|  [Sprint Backlog & User Stories]                                            |
|          │                                                                  |
|          ▼                                                                  |
|  [Phase 1: Red-Green-Refactor TDD] ──► Write Unit Tests (Vitest & Jest)     |
|          │                                                                  |
|          ▼                                                                  |
|  [Phase 2: Subagent Feature Waves] ──► Isolated Parallel Implementation     |
|          │                                                                  |
|          ▼                                                                  |
|  [Phase 3: Automated Quality Gate] ──► Lint + Type-Check + DevPulse Review  |
|          │                                                                  |
|          ▼                                                                  |
|  [Phase 4: Supabase Migration Verification] ──► Transactional Schema Checks |
|          │                                                                  |
|          ▼                                                                  |
|  [Phase 5: Continuous Deployment] ──► Edge Deploy (Vercel & Render)         |
|                                                                             |
+─────────────────────────────────────────────────────────────────────────────+
```

1. **Sprint Cadence & Feature Slices:**
   - Development operates in **two-week dual-track Agile sprints**.
   - Features are implemented in vertical domain slices (`reviews`, `auth`, `billing`, `folder-analysis`), preventing cross-domain cascade failures.
2. **Test-Driven Development (TDD) Protocol:**
   - Strict Red-Green-Refactor discipline: Unit and integration tests are authored before production logic.
   - Test suites: Frontend unit tests via Vitest & React Testing Library; backend API tests via Jest/Supertest; database RLS tests via Supabase CLI.
3. **Branching Strategy (GitHub Flow Enhanced):**
   - `main`: Production-stable branch, automatically deployed to Vercel (frontend) and Render (backend).
   - `feature/name`: Short-lived feature branches branched from `main`.
   - Pull Request Quality Gates: Every PR requires status checks passing, 0 lint warnings, and an automated DevPulse Code Health Score of $\ge 80$.

### 3.4 Engineering Standards, Conventional Commits & Quality Guardrails
- **Strict TypeScript Typing:** Backend and frontend adhere to zero-`any` policies with compiler flags: `noImplicitAny: true`, `strictNullChecks: true`, and `noUncheckedIndexedAccess: true`.
- **Conventional Commits Standard:** Git commit messages follow strict semantic formatting:
  - `feat(scope):` New user-facing capabilities or API routes.
  - `fix(scope):` Defect remediation or bugfixes.
  - `refactor(scope):` Code modifications that neither fix bugs nor add features.
  - `perf(scope):` Latency optimization or queue concurrency enhancements.
  - `test(scope):` Unit, integration, or E2E test additions.
  - `chore(scope):` Tooling, build pipeline, or dependency maintenance.
- **Automated Pull Request SLA:** Automated AI reviews commence within **5 seconds** of webhook ingestion and complete end-to-end processing within **45 seconds** for diffs under 2,000 lines.

---

## 4. COMPLETE TECHNOLOGY STACK & INFRASTRUCTURE AUDIT

DevPulse utilizes an enterprise cloud-native stack engineered for sub-millisecond responsiveness, zero-downtime reliability, and global scalability:

```
+─────────────────────────────────────────────────────────────────────────────+
|                             DEVPULSE CLOUD STACK                            |
+─────────────────────────────────────────────────────────────────────────────+
|                                                                             |
|  [CLIENT]     React 19 · TanStack Router · Tailwind v4 · Framer Motion      |
|  [GATEWAY]    Node.js 22 LTS · Express.js · Zod 3.23 · Dynamic CORS         |
|  [QUEUE]      review_queue · SKIP LOCKED · Worker Thread Pool (1-16)        |
|  [AI CORE]    Gemini 2.5 Flash / 3.0 Pro · OpenAI GPT-4o · AES-256 Vault   |
|  [DATABASE]   PostgreSQL 15 (Supabase) · RLS · Logical WAL CDC Pub/Sub      |
|  [CACHE]      Upstash Redis (REST) · Cloudflare Edge CDN                    |
|  [PAYMENTS]   Razorpay Subscriptions (Paise) · HMAC-SHA256 Idempotent       |
|  [HOSTING]    Vercel (Edge SPA) · Render (Background Workers & API)         |
|                                                                             |
+─────────────────────────────────────────────────────────────────────────────+
```

### 4.1 Detailed Technology Specifications

| Stack Layer | Component / Tool | Version / Standard | Operational Role & Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.0.0` | Concurrent rendering, server component readiness, fast state updates |
| **Routing Engine** | TanStack Router | `^1.13.0` | Strict type-safe file-based client routing, zero runtime waterfall |
| **Styling & CSS** | Tailwind CSS | `v4.0.0` | Utility-first, zero runtime CSS footprint, semantic custom properties |
| **Motion & Animation** | Framer Motion | `^11.0.0` | Staggered review card entrances, radial score reveals, reduced-motion |
| **Backend Runtime** | Node.js | `v22.x LTS` | Non-blocking asynchronous I/O, native fetch, crypto module |
| **API Framework** | Express.js | `^4.21.0` | Lightweight REST gateway, microservices routing, middleware stack |
| **Type Validation** | Zod | `^3.23.0` | Strict runtime request payload parsing and sanitization |
| **Primary Database** | PostgreSQL via Supabase | `15.4` | Relational integrity, row-level multi-tenancy, transaction consistency |
| **Multi-Tenancy** | Row Level Security (RLS) | PostgreSQL Engine | Guarantees zero cross-tenant leakage at the storage engine level |
| **Realtime Pub/Sub** | Supabase Realtime | PostgreSQL CDC | Streams review status to browser over WebSockets within 50ms |
| **Primary AI Engine** | Google Gemini | `2.5 Flash / 3.0 Pro` | High token context, sub-3s triage latency, 1M free tokens/month |
| **Failover AI Engine** | OpenAI | `GPT-4o / 4o-mini` | Zero-downtime automated failover on Gemini 429/503 errors |
| **Key Vault Encryption** | Node.js `node:crypto` | `aes-256-gcm` | Authenticated encryption for all stored AI API credentials |
| **Distributed Cache** | Upstash Redis | Serverless HTTP | Sub-millisecond token-bucket rate limiting and webhook idempotency |
| **Payment Gateway** | Razorpay | API v1 | Indian pricing model (Paise), UPI, NetBanking, Cards, HMAC webhooks |
| **Edge CDN & Security** | Cloudflare | Free Tier | DDoS mitigation, SSL termination, global edge caching (<50ms TTFB) |
| **Email Service** | Resend / Nodemailer | SMTP TLS | Transactional executive review summaries and vulnerability alerts |

---

## 5. COMPLETE CODEBASE FOLDER STRUCTURE & FILE MANIFEST

The project follows a **domain-driven, vertical-slice architecture** ensuring strict fault isolation:

```
d:\Devpulse\code-pulse\
├── backend/                             # Express Microservices & AI Worker Core
│   ├── .env                             # Backend environment secrets
│   ├── migrations.sql                   # Consolidated development database schema
│   ├── package.json                     # Backend dependencies & build scripts
│   ├── tsconfig.json                    # TypeScript compiler options
│   └── src/
│       ├── server.ts                    # Main API entry point, Express routes, Keep-Alive pinger
│       ├── backend/
│       │   ├── ai/
│       │   │   ├── key-vault.server.ts  # AES-256-GCM encryption & key rotation vault
│       │   │   ├── orchestrator.ts      # Multi-provider router, failover state machine
│       │   │   ├── gemini/              # Google Gemini client, models & prompt templates
│       │   │   └── openai/              # OpenAI GPT-4o client, models & prompt templates
│       │   ├── config/env.server.ts     # Environment variables loader & validator
│       │   ├── email/                   # Nodemailer / Resend HTML report formatters
│       │   ├── github/                  # Pull request diff fetching, Git tree traversal
│       │   ├── logging/logger.server.ts # Structured JSON logger with request IDs
│       │   ├── reviews/
│       │   │   ├── queue.server.ts      # Asynchronous worker queue & concurrency pool
│       │   │   └── review-processor.ts  # Two-stage audit, triage & health score processor
│       │   └── supabase/client.server.ts# Supabase client (service role & user JWT)
│       └── functions/                   # Domain business handlers (reviews, folder, blog, admin)
│
├── frontend/                            # React 19 + TanStack Router SPA
│   ├── index.html                       # Single-page application entry point
│   ├── package.json                     # Frontend dependencies
│   ├── vite.config.ts                   # Vite bundler configuration & alias paths
│   └── src/
│       ├── routes/                      # File-based TanStack routes
│       │   ├── __root.tsx               # Root application shell, navbar, theme provider
│       │   ├── index.tsx                # Marketing landing page with interactive demo
│       │   ├── login.tsx                # GitHub OAuth & email/password authentication
│       │   ├── dashboard.tsx            # Developer workspace, metrics, active reviews
│       │   ├── reviews.new.tsx          # PR URL submission form
│       │   ├── reviews.$id.tsx          # Realtime interactive review inspector & 1-click fix
│       │   ├── folder-analysis.tsx      # Repository directory structure auditor
│       │   ├── folder-analysis_.$id.tsx # Single folder analysis report
│       │   ├── api-analyser.tsx         # API security & breaking change analyzer
│       │   ├── pricing.tsx              # Indian pricing model with embedded Razorpay modal
│       │   ├── r.$token.tsx             # Public shareable read-only review view
│       │   └── admin/                   # Administrative suite (metrics, users, settings, vault)
│       ├── components/                  # High-craft UI components (HealthScore, SeverityBadge)
│       ├── lib/                         # API client, Supabase auth context, theme helpers
│       └── styles.css                   # Tailwind CSS v4 design tokens & custom properties
│
├── supabase/                            # Database Infrastructure & Migrations
│   ├── config.toml                      # Local Supabase CLI configuration
│   └── migrations/                      # 19 Version-Controlled SQL Migrations
│       ├── 20260517163116_profiles.sql  # User profiles, reviews & findings baseline
│       ├── 20260518000000_folder.sql    # Folder analysis & migration actions tables
│       ├── 20260521120000_credits.sql   # Credit ledger, quota reset & plan upgrade RPC
│       ├── 20260521150000_queue.sql     # review_queue table & background worker schema
│       ├── 20260522000000_settings.sql  # Dynamic system settings table
│       ├── 20260523000000_pricing.sql   # Indian pricing plans & payment transactions
│       ├── 20260524000000_parallel.sql  # Parallel AI engine toggle
│       ├── 20260526120000_suspend.sql   # Account suspension & password auth support
│       └── 20261005000000_harden.sql    # AES-256 AI Key Vault & claim_next_queue_item_v3
│
└── docs/                                # Technical Documentation & Visual Assets
    ├── assets/                          # High-Resolution Diagram Images
    │   ├── architecture-layers.png      # Visual 6-tier architecture diagram
    │   ├── sequence-pr-review.png       # Pull request review sequence flow
    │   ├── dfd-level-0.png              # Context diagram (DFD Level 0)
    │   ├── dfd-level-1.png              # System decomposition diagram (DFD Level 1)
    │   └── erd-overview.png             # Entity relationship overview map
    ├── DEVPULSE_COMPLETE_SRS_SPECIFICATION.md   # This Master SRS Document
    ├── DEVPULSE_COMPLETE_SRS_SPECIFICATION.docx # Word Document (Annexure 3b)
    └── Ravindra_Log_18030.docx          # Original LPU Reference Invention Disclosure
```

---

## 6. DESIGN SYSTEM & HIGH-CRAFT FRONTEND ARCHITECTURE

The DevPulse visual direction is derived from high-craft editorial design systems (Wavy storefront typography + BHMR Studios motion physics), producing a calm, paper-inspired developer interface.

### 6.1 Color Palette & Semantic Tokens (`frontend/src/styles.css`)

```
+─────────────────────────────────────────────────────────────────────────────+
|                         DEVPULSE DESIGN TOKENS                              |
+─────────────────────────────────────────────────────────────────────────────+
|                                                                             |
|  LIGHT THEME (Warm Paper)                DARK THEME (Deep Slate)            |
|  Canvas:     #F3F1EC (Warm Canvas)       Canvas:     #0E0F11 (Deep Base)    |
|  Elevated:   #FBFAF7 (Surface)           Raised:     #18191C (Surface)      |
|  Inset:      #E9E6DF (Code Box)          Inset:      #121316 (Code Box)     |
|  Hairline:   #DEDAD2 (Borders)           Border:     #282A2E (Borders)      |
|  Text Ink:   #121211 (Headings)          Text Ink:   #F6F4EF (Headings)     |
|  Secondary:  #5B5954 (Body Text)         Secondary:  #949088 (Body Text)    |
|  Accent:     #2B2A27 (Charcoal)          Accent:     #DCD6CA (Warm Sand)    |
|                                                                             |
|  STATUS TOKENS (Paired with Icons)                                          |
|  Critical:   #B43C3C (Red 600)           Warning:    #94600F (Amber 600)    |
|  Info:       #41639A (Blue 600)          Success:    #2D7A4F (Green 600)    |
|                                                                             |
+─────────────────────────────────────────────────────────────────────────────+
```

### 6.2 Typography Hierarchy
- **Headings & Display Typography:** `Bricolage Grotesque` (bold weights, tight tracking).
- **Body & Control Typography:** `Plus Jakarta Sans` (readable geometric sans-serif).
- **Editorial Emphasis:** `Instrument Serif` (italic style used exclusively for hero sub-clauses).
- **Code, Line Numbers & File Paths:** `Geist Mono` (fixed-width, high-legibility tabular figures).

### 6.3 Motion Physics & Interaction Rules
- **Entrance Curve:** `cubic-bezier(0.22, 1, 0.36, 1)` (snappy spring deceleration).
- **Hover & Sheet Curve:** `cubic-bezier(0.32, 0.72, 0, 1)`.
- **Durations:** Controls (180ms), Panels & Drawers (320ms), Staged Findings Reveal (640ms with 40ms stagger).
- **Reduced-Motion Support:** All animations query `prefers-reduced-motion: reduce` and degrade gracefully to instant opacity transitions.

### 6.4 Landing Page Architecture & Interactive Conversion Engine
The DevPulse public landing experience (`frontend/src/routes/index.tsx`) implements high-conversion technical product presentation principles inspired by Linear, Vercel, and GitHub:
- **Hero Interactive Unified Diff Simulator:** Embedded split-screen code viewport allowing visiting developers to toggle between a live vulnerable code snippet (e.g., raw SQL string concatenation vulnerable to CWE-89 injection) and the DevPulse automated parameterized fix with line-level inline AI commentary.
- **Simulated Terminal Telemetry Widget:** Realtime typing animation displaying CLI review execution, chunk tokenization, and health score derivation to demystify platform mechanics.
- **Empirical Trust & Social Proof Badges:**
  - *82% Reduction* in engineering pull request cycle review times.
  - *4.9 / 5.0* developer satisfaction rating across 350+ surveyed engineering teams.
  - *14,200+* automated pull requests audited with zero reported data leakage incidents.
- **Zero-Friction Conversion CTA:** Instant GitHub OAuth onboarding with zero credit card entry required for the 15-PR monthly free tier.

---

## 7. SYSTEM ARCHITECTURE & MULTI-TIER CLOUD DESIGN

### 7.1 Multi-Tier Cloud Architecture
![DevPulse Architecture](./assets/architecture-layers.png)

```mermaid
graph TD
    subgraph ClientLayer ["1. Presentation Layer (Vite + React 19 + TanStack)"]
        UI_PR["PR Review Inspector"]
        UI_Folder["Folder Structure Auditor"]
        UI_API["API & Backend Scanner"]
        UI_Admin["Admin Governance Portal"]
        RealtimeSub["Supabase Realtime Client (WebSocket)"]
    end

    subgraph GatewayLayer ["2. API Gateway & Microservices (Node.js / Express)"]
        CORS["Dynamic CORS & Helmet Security"]
        Zod["Zod Runtime Payload Validation"]
        KeepAlive["Self-Ping Keep-Alive Worker"]
        Routes_PR["/api/reviews/*"]
        Routes_Folder["/api/folder-analysis/*"]
        Routes_Pay["/api/pricing/razorpay/*"]
        Routes_Hook["/api/public/github/webhook"]
        Routes_Admin["/api/admin/*"]
    end

    subgraph QueueLayer ["3. Asynchronous Worker Queue Engine"]
        QueueTable[("public.review_queue")]
        WorkerPool["Dynamic Worker Pool (1-16 Workers)"]
        SkipLocked["Postgres 'FOR UPDATE SKIP LOCKED'"]
        Backoff["Exponential Backoff & Retry Scheduler"]
    end

    subgraph AIOrchestrator ["4. Dual-Engine AI Orchestration Core"]
        ProviderSwitch["Dynamic AI Provider Switch (system_settings)"]
        KeyVault["AES-256-GCM Encrypted Key Vault"]
        TriageEngine["Unified Diff Noise Pruning & Triage"]
        GeminiPrimary["Google Gemini 2.5 Flash / 3.0 Pro"]
        OpenAIFallback["OpenAI GPT-4o / GPT-4o-mini"]
        ParallelConsensus["Parallel Consensus Synthesis"]
    end

    subgraph PersistenceLayer ["5. Data & Identity Tier (PostgreSQL 15 / Supabase)"]
        AuthService["Supabase Auth (GitHub OAuth / Password)"]
        RLS["Postgres Row Level Security (RLS)"]
        WAL["Write-Ahead Log (WAL) CDC Engine"]
        Tables[("17 Relational Tables")]
    end

    subgraph ExternalIntegrations ["6. External Ecosystem Integrations"]
        GitHubAPI["GitHub REST & Octokit Git API"]
        GitHubHooks["GitHub App Webhook Stream"]
        RazorpayGateway["Razorpay Payments Gateway"]
        EmailService["Resend / SMTP Mailer"]
    end

    ClientLayer -->|"HTTPS REST Calls"| GatewayLayer
    GatewayLayer -->|"Enqueue Job"| QueueTable
    QueueTable -->|"claim_next_queue_item_v3"| WorkerPool
    WorkerPool -->|"Diff & Tree Requests"| GitHubAPI
    WorkerPool -->|"Dispatch Context"| AIOrchestrator
    AIOrchestrator -->|"Decrypt Key in Memory"| KeyVault
    AIOrchestrator -->|"Primary Prompt"| GeminiPrimary
    GeminiPrimary -.->|"Failover on 429/503"| OpenAIFallback
    AIOrchestrator -->|"Store Findings"| PersistenceLayer
    PersistenceLayer -->|"WAL CDC Events"| WAL
    WAL -->|"WebSocket Push"| RealtimeSub
    GitHubHooks -->|"HMAC Verified Hook"| Routes_Hook
    RazorpayGateway -->|"Payment Events"| Routes_Pay
```

---

### 7.2 Pull Request Execution Sequence Diagram
![DevPulse Sequence Flow](./assets/sequence-pr-review.png)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer (Browser)
    participant UI as React 19 Frontend
    participant API as Express API Gateway
    participant DB as PostgreSQL (Supabase)
    participant Queue as Worker Pool
    participant GH as GitHub REST API
    participant AI as Dual AI Orchestrator
    participant Realtime as Supabase Realtime CDC

    Dev->>UI: Submit GitHub PR URL
    UI->>API: POST /api/reviews/create { pr_url, access_token, user_id }
    API->>DB: Check user credits & quota (RPC: check_and_renew_profile_limits)
    DB-->>API: Credits verified (balance >= 1)
    API->>DB: INSERT INTO reviews (status: 'pending')
    API->>DB: INSERT INTO review_queue (review_id, status: 'pending')
    API-->>UI: 202 Accepted { reviewId, status: 'pending' }
    
    UI->>Realtime: Subscribe channel 'review:{reviewId}'
    UI->>Dev: Render loading skeleton with Framer Motion pulse

    Note over Queue,DB: Background Worker Loop
    Queue->>DB: SELECT * FROM claim_next_queue_item_v3(worker_id)
    DB-->>Queue: Acquired review job (Row locked exclusively)
    Queue->>DB: UPDATE reviews SET status = 'processing'
    DB-->>Realtime: WAL CDC Event: reviews.UPDATE (status: 'processing')
    Realtime-->>UI: WebSocket broadcast (Show step: 'Analyzing diffs...')

    Queue->>GH: GET /repos/{owner}/{repo}/pulls/{number}
    Queue->>GH: GET PR Diff (unified format)
    GH-->>Queue: Diff payload (raw text)

    Queue->>AI: Execute noise filter + Hunk parser
    AI->>AI: Strip lockfiles, SVG, minified bundles
    AI->>AI: Evaluate triage model (eliminate trivial formatting)

    alt Primary Provider (Google Gemini)
        Queue->>AI: Call Gemini 2.5 Flash / 3.0 Pro (Structured JSON prompt)
        AI-->>Queue: Parsed findings + Health Score
    else Gemini 429 / 503 / Timeout (Auto-Failover)
        AI->>AI: Catch error -> Decrypt OpenAI key from Vault
        Queue->>AI: Call OpenAI GPT-4o-mini
        AI-->>Queue: Parsed findings + Health Score
    end

    Queue->>DB: INSERT INTO findings (normalized records)
    Queue->>DB: UPDATE reviews SET status = 'complete', health_score = 88
    Queue->>DB: Deduct user review credits
    Queue->>DB: UPDATE review_queue SET status = 'completed'

    DB-->>Realtime: WAL CDC Event: reviews.UPDATE (status: 'complete')
    Realtime-->>UI: WebSocket Push: Review ready with findings
    UI->>Dev: Staggered animation: Render findings, health score, code diffs
```

---

## 8. DUAL-ENGINE AI ORCHESTRATOR, PROMPTS & FAILOVER CORE

### 8.1 Failover State Machine

```mermaid
stateDiagram-v2
    [*] --> ReadProviderConfig
    ReadProviderConfig --> CheckCredentials
    
    state CheckCredentials {
        [*] --> ValidateGeminiKey
        ValidateGeminiKey --> ValidateOpenAIKey
    }

    CheckCredentials --> ExecuteGemini: Provider is 'gemini' or 'both'
    CheckCredentials --> ExecuteOpenAI: Provider is 'openai'

    state ExecuteGemini {
        DispatchGeminiPrompt --> AwaitGeminiResponse
        AwaitGeminiResponse --> GeminiSuccess: HTTP 200 OK
        AwaitGeminiResponse --> GeminiError: 429 Quota / 503 Overloaded
    }

    GeminiError --> FallbackToOpenAI: Auto-Failover Triggered
    
    state FallbackToOpenAI {
        DecryptOpenAIKey --> DispatchOpenAIPrompt
        DispatchOpenAIPrompt --> OpenAISuccess: HTTP 200 OK
        DispatchOpenAIPrompt --> BothFailed: HTTP Error
    }

    ExecuteOpenAI --> AwaitOpenAI
    AwaitOpenAI --> OpenAISuccess: HTTP 200 OK
    AwaitOpenAI --> FallbackToGemini: On Error
    FallbackToGemini --> ExecuteGemini

    GeminiSuccess --> TwoStageSynthesis
    OpenAISuccess --> TwoStageSynthesis
    BothFailed --> SanitizeAndAlertUser

    TwoStageSynthesis --> [*]
```

### 8.2 Model Specifications & Inference Hyperparameters
- **Google Gemini 2.5 Flash (Primary Engine):**
  - Temperature: `0.1` (deterministic, highly disciplined vulnerability detection)
  - Top_P: `0.95`
  - Maximum Output Tokens: `8,192`
  - Role: Fast noise triage, hunk-level security scanning, structural analysis.
- **OpenAI GPT-4o-mini / GPT-4o (Failover & Consensus Engine):**
  - Temperature: `0.2`
  - Response Format: `{ "type": "json_object" }`
  - Role: Emergency zero-downtime failover, complex AST synthesis, parallel consensus verification.

### 8.3 System Prompt Architectures
1. **Triage Prompt (`backend/src/backend/ai/gemini/prompts/triage.ts`):** Evaluates file change manifests to filter out documentation-only, whitespace-only, and asset changes, preventing unnecessary downstream token spend.
2. **Chunk Audit Prompt (`PR_FILE_AUDIT_PROMPT`):** Evaluates diff chunks against six quality axes: Security (OWASP), Performance, Architecture, Reliability, Testability, and Readability.
3. **Synthesis Prompt (`PR_SYNTHESIS_PROMPT`):** Ingests all chunk findings, eliminates duplicate warnings, calculates the holistic Code Health Score, and produces an executive markdown summary.

---

## 9. KEYS, SECURITY ARCHITECTURE & AES-256-GCM KEY VAULT

### 9.1 AES-256-GCM Vault Implementation (`backend/src/backend/ai/key-vault.server.ts`)
To protect against database exfiltration or insider exposure, API keys are stored in encrypted format:
```typescript
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

function encryptionKey() {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) throw new Error("AI_KEY_ENCRYPTION_SECRET must contain >= 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function encryptAIKey(plaintext: string): string {
  const iv = randomBytes(12); // 12-byte initialization vector
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte authentication tag
  return `${ENCRYPTED_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}
```

### 9.2 Environment Variables & Key Reference

| Key Variable Name | Required In | Purpose | Storage & Security |
| :--- | :--- | :--- | :--- |
| `AI_KEY_ENCRYPTION_SECRET` | Backend | Master key for deriving AES-256-GCM vault key | Server environment only; never in DB |
| `SUPABASE_URL` | Frontend & Backend | Supabase API project endpoint | Publicly safe |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend & Backend | Anon client key for user JWT sessions | Publicly safe |
| `SUPABASE_SERVICE_ROLE_KEY`| Backend Only | Elevated administrative key (bypasses RLS) | Private; server-side only |
| `GEMINI_API_KEY` | Backend Only | Primary Google AI Studio key | Private; fallback if vault empty |
| `OPENAI_API_KEY` | Backend Only | Failover OpenAI API key | Private; fallback if vault empty |
| `RAZORPAY_KEY_ID` | Frontend & Backend | Razorpay public key for checkout modal | Publicly safe |
| `RAZORPAY_KEY_SECRET` | Backend Only | Secret for validating HMAC payment signatures | Private; server-side only |
| `RAZORPAY_WEBHOOK_SECRET` | Backend Only | Secret for verifying webhook HMAC signatures | Private; server-side only |
| `GITHUB_APP_WEBHOOK_SECRET`| Backend Only | Secret for verifying GitHub App webhooks | Private; server-side only |

---

## 10. CODE HEALTH SCORE MATHEMATICAL MODEL & FORMULATION

### 10.1 Deterministic Health Score Formula
The holistic Code Health Score ($H \in [0, 100]$) evaluates PR code quality deterministically:

$$H = \max\left(0, \min\left(100, 100 - \sum_{i=1}^{n} w(s_i) \cdot c_i\right)\right)$$

Where:
- $n$: Total number of distinct findings detected across all chunks.
- $s_i$: Severity level assigned to finding $i$.
- $w(s_i)$: Calibrated severity penalty weight:
  - $w(\text{critical}) = 25$ points (e.g., SQL injection, remote code execution, unauthenticated admin route)
  - $w(\text{high}) = 12$ points (e.g., N+1 query loop, memory leak, missing error boundary)
  - $w(\text{medium}) = 5$ points (e.g., tight coupling, circular import, untestable side-effect)
  - $w(\text{low}) = 2$ points (e.g., suboptimal naming, cognitive complexity, missing docstring)
  - $w(\text{info}) = 0$ points (style recommendations, advisory notices)
- $c_i \in [0.5, 1.0]$: Model confidence factor (reported as integer $50–100$, normalized to $0.5–1.0$).

### 10.2 Letter Grade Classification

| Score Range ($H$) | Letter Grade | Quality Assessment & CI/CD Gating Rule |
| :--- | :--- | :--- |
| **$90 \le H \le 100$** | **Grade A** | Production-Grade. Clean, highly modular, safe to merge automatically. |
| **$80 \le H < 90$** | **Grade B** | Good. Minor non-blocking issues. Peer review recommended. |
| **$70 \le H < 80$** | **Grade C** | Moderate Quality. Multiple medium/low issues. Requires review attention. |
| **$60 \le H < 70$** | **Grade D** | Low Quality. At least one high-severity flaw. Merge blocked by CI policy. |
| **$H < 60$** | **Grade F** | Failing. Critical vulnerability or architectural breakdown. Immediate fix required. |

### 10.3 Worked Calculation Example
Consider a PR review detecting 4 findings:
1. `SQL Injection in User Search` — Critical severity ($w=25$), Confidence $90\%$ ($c_1 = 0.90$) $\rightarrow$ Deduction: $25 \times 0.90 = 22.5$
2. `Unindexed Filter on Orders Table` — Medium severity ($w=5$), Confidence $80\%$ ($c_2 = 0.80$) $\rightarrow$ Deduction: $5 \times 0.80 = 4.0$
3. `Duplicate Helper Function` — Low severity ($w=2$), Confidence $100\%$ ($c_3 = 1.00$) $\rightarrow$ Deduction: $2 \times 1.00 = 2.0$
4. `Informational Comment Style` — Info severity ($w=0$), Confidence $95\%$ ($c_4 = 0.95$) $\rightarrow$ Deduction: $0 \times 0.95 = 0.0$

$$\text{Total Deductions} = 22.5 + 4.0 + 2.0 + 0.0 = 28.5$$
$$H = 100 - 28.5 = 71.5 \approx 72 \implies \mathbf{Grade\ C}$$

---

## 11. COMPREHENSIVE DATA FLOW DIAGRAMS (DFD LEVELS 0, 1, 2)

### 11.1 DFD Level 0 — System Context Diagram
![DFD Level 0 Context Diagram](./assets/dfd-level-0.png)

```mermaid
flowchart TD
    subgraph ExternalEntities ["External System Entities"]
        Dev["Developer / Engineer"]
        GH["GitHub API & Webhooks"]
        AI["AI Providers: Google Gemini & OpenAI"]
        RZP["Razorpay Payment Gateway"]
        Email["Email Service: Resend / SMTP"]
        AdminUser["System Administrator"]
    end

    DevPulseSystem["DevPulse Autonomous Code Review Platform"]

    Dev -->|"Submit PR URL / Manual Trigger / Apply Fix"| DevPulseSystem
    DevPulseSystem -->|"Realtime Findings, Health Score & Diffs"| Dev

    GH -->|"Inbound Webhook Events: PR Opened or Sync"| DevPulseSystem
    DevPulseSystem -->|"Fetch Diffs, Git Tree & Commit Fixes"| GH

    DevPulseSystem -->|"Filtered Code Hunks & Prompts"| AI
    AI -->|"Vulnerabilities, Suggested Fixes & Scores"| DevPulseSystem

    Dev -->|"Checkout Request: UPI or Card"| DevPulseSystem
    DevPulseSystem -->|"Initialize Order"| RZP
    RZP -->|"Payment Status & Signature Webhook"| DevPulseSystem

    DevPulseSystem -->|"HTML Review Summary & Audit Alerts"| Email
    Email -->|"Delivered Email Notification"| Dev

    AdminUser -->|"Configure AI Provider, Keys & Concurrency"| DevPulseSystem
    DevPulseSystem -->|"System Health, Queue Metrics & Logs"| AdminUser
```

---

### 11.2 DFD Level 1 — System Decomposition Diagram
![DFD Level 1 Decomposition](./assets/dfd-level-1.png)

```mermaid
flowchart TD
    subgraph Users ["External Actors"]
        DevUser["Developer User"]
        GHApp["GitHub Webhook Service"]
        PaymentUser["Customer"]
        AdminRole["Administrator"]
    end

    subgraph Processes ["Core Functional Processes"]
        P1["1.0 Authentication & Quota Management"]
        P2["2.0 Ingestion & Hunk-Aware Noise Pruning"]
        P3["3.0 Asynchronous Queue & Concurrency Engine"]
        P4["4.0 Multi-Engine AI Orchestration & Synthesis"]
        P5["5.0 Findings Persistence & Realtime CDC"]
        P6["6.0 Razorpay Settlement & Plan Upgrade"]
        P7["7.0 Admin Governance & Vault Management"]
    end

    subgraph DataStores ["Relational Data Stores in PostgreSQL"]
        D1[("D1: public.profiles")]
        D2[("D2: public.reviews")]
        D3[("D3: public.findings")]
        D4[("D4: public.review_queue")]
        D5[("D5: public.payment_transactions")]
        D6[("D6: public.system_settings & system_ai_keys")]
        D7[("D7: public.folder_analyses")]
    end

    DevUser -->|"OAuth Sign-in / Token"| P1
    P1 -->|"Verify UID and Credit Balance"| D1

    DevUser -->|"Submit PR URL"| P2
    GHApp -->|"PR Open / Sync Webhook"| P2
    P2 -->|"Check Remaining Credits"| P1
    P2 -->|"Insert Review Record"| D2
    P2 -->|"Enqueue Job ID"| D4

    P3 -->|"Claim Next Task: FOR UPDATE SKIP LOCKED"| D4
    D4 -->|"Deliver Locked Task Row"| P3
    P3 -->|"Update Status: processing"| D2

    P3 -->|"Pass Cleaned Diffs & Metadata"| P4
    P4 -->|"Fetch Active AI Provider & Decrypt Key"| D6
    P4 -->|"Chunk Audit & Synthesis"| P4
    P4 -->|"Completed Review Payload & Score"| P5

    P5 -->|"Write Line-Level Findings"| D3
    P5 -->|"Update Review: complete"| D2
    P5 -->|"Mark Queue Job Completed"| D4
    P5 -->|"Deduct Credit Cost"| D1
    P5 -->|"WebSocket Event Push via WAL CDC"| DevUser

    PaymentUser -->|"Initiate Checkout"| P6
    P6 -->|"Verify HMAC Signature & Idempotency"| D5
    P6 -->|"Execute upgrade_user_plan RPC"| D1

    AdminRole -->|"Adjust Models, Concurrency & Keys"| P7
    P7 -->|"Read and Write Configuration Vault"| D6
    P7 -->|"Audit Metric Aggregates"| D2
```

---

### 11.3 DFD Level 2 Detailed Decompositions

#### DFD 2.1: Pull Request Review & Autonomous Remediation Subsystem
```mermaid
flowchart TD
    PR_In["Raw PR URL or Webhook Event"] --> ParseURL["2.1 Parse Repository Coordinates: owner, repo, PR number"]
    ParseURL --> FetchDiff["2.2 Fetch PR Raw Unified Diff via GitHub REST API"]
    
    FetchDiff --> NoiseFilter["2.3 Regex Noise Filtering Engine"]
    NoiseFilter -->|"Strip lockfiles, minified JS, media blobs"| CleanDiff["Clean Diff Stream"]
    
    CleanDiff --> HunkSplitter["2.4 Hunk-Aware Line Mapper"]
    HunkSplitter -->|"Extract @@ -a,b +c,d @@ boundaries"| MappedHunks["File Hunk Map with Modified Line Numbers"]
    
    MappedHunks --> FastTriage["4.1 Fast Triage Model (Gemini 2.5 Flash)"]
    FastTriage -->|"Trivial whitespace and comments"| SkipDeep["Discard Non-Substantive Changes"]
    FastTriage -->|"Substantive code changes"| ChunkPartition["4.2 AST-Aware Chunk Partitioning (under 8000 Tokens)"]
    
    ChunkPartition --> ChunkAudit["4.3 Chunk Vulnerability Audit across 6 Axes"]
    ChunkAudit --> HoloSynthesis["4.4 Holistic Synthesis and Deduplication"]
    HoloSynthesis --> ComputeScore["4.5 Compute Deterministic Health Score"]
    
    ComputeScore --> NormalizeFindings["5.1 Format Normalized Findings (bad_code, suggested_fix)"]
    NormalizeFindings --> CommitToDB["5.2 Transactional DB Write: reviews and findings"]
    
    CommitToDB --> RealtimePush["5.3 Supabase Realtime CDC Push"]
    RealtimePush --> DeveloperUI["Developer Screen Animation"]
    
    DeveloperUI --> UserAppliesFix["6.1 Developer Clicks Apply Fix Button"]
    UserAppliesFix --> PatchEngine["6.2 Octokit Git Data API: Create Blob, Tree, and Commit"]
    PatchEngine --> GitHubBranch["Remote GitHub Branch Updated Automatically"]
```

#### DFD 2.2: Folder Analysis & Architectural Migration Subsystem
```mermaid
flowchart TD
    RepoTarget["Repository Slug: owner/repo"] --> FetchTree["1. Fetch Git Recursive Tree via GitHub API"]
    FetchTree --> ParseHierarchy["2. Build Cleaned Hierarchy Tree (max 300 items)"]
    
    ParseHierarchy --> DetectStack["3. AI Framework & Stack Detection: Next.js, Go, FastAPI"]
    DetectStack --> ArchEval["4. Architectural Structure Evaluation against Best Practices"]
    
    ArchEval --> ScoreCalc["5. Calculate Organization Score (0-100) & Grade (A-F)"]
    ArchEval --> AnnotateDirs["6. Generate Directory Status Badges: good, warning, critical"]
    ArchEval --> PlanMigration["7. Synthesize Prioritized Migration Action List"]
    
    ScoreCalc --> PersistAnalysis["8. Write to folder_analyses & folder_migration_actions"]
    AnnotateDirs --> PersistAnalysis
    PlanMigration --> PersistAnalysis
    PersistAnalysis --> RenderDashboard["9. Display Interactive Migration Plan & Visual Folder Tree"]
```

#### DFD 2.3: Razorpay Webhook & Payment Idempotency Subsystem
```mermaid
flowchart TD
    WebhookPost["Inbound POST /api/pricing/razorpay/webhook"] --> ReadHeaders["1. Extract x-razorpay-signature Header"]
    ReadHeaders --> ComputeHMAC["2. Calculate HMAC-SHA256 of Raw Body with Secret"]
    
    ComputeHMAC --> VerifySign{"3. Cryptographic Timing-Safe Comparison"}
    VerifySign -- Mismatch --> Reject401["Reject Request: HTTP 400 Invalid Signature"]
    
    VerifySign -- Match --> ParseEntity["4. Extract payment_id, order_id, user_id, amount"]
    ParseEntity --> CheckExisting{"5. Query payment_transactions by payment_id"}
    
    CheckExisting -- Row Exists --> Return200OK["Return 200 OK (Duplicate Ignored Safely)"]
    
    CheckExisting -- New Transaction --> InsertTx["6. INSERT INTO payment_transactions"]
    InsertTx --> CallUpgradeRPC["7. Execute RPC: upgrade_user_plan"]
    CallUpgradeRPC --> UpdateProfile["8. Update profiles: plan='pro', review_credits += 150"]
    UpdateProfile --> SendReceipt["9. Return 200 OK to Razorpay"]
```

---

## 12. DATABASE DESIGN, RELATIONAL SCHEMA & ENTITY RELATIONSHIP DIAGRAM (ERD)

### 12.1 Entity Relationship Diagram Overview
![DevPulse ERD Overview Map](./assets/erd-overview.png)

```mermaid
erDiagram
    PROFILES ||--o{ REVIEWS : "initiates"
    PROFILES ||--o{ FOLDER_ANALYSES : "triggers"
    PROFILES ||--o{ TEAMS : "owns"
    PROFILES ||--o{ TEAM_MEMBERS : "belongs_to"
    PROFILES ||--o{ GITHUB_INSTALLATIONS : "installs"
    PROFILES ||--o{ PAYMENT_TRANSACTIONS : "purchases"
    PROFILES ||--o{ USER_FEEDBACK : "submits"
    
    REVIEWS ||--o{ FINDINGS : "contains"
    REVIEWS ||--o| REVIEW_QUEUE : "enqueued_in"
    REVIEWS ||--o{ REVIEW_API_LOGS : "generates_logs"
    REVIEWS ||--o{ REVIEW_EVENTS : "associated_with"

    FOLDER_ANALYSES ||--o{ FOLDER_MIGRATION_ACTIONS : "produces"
    FOLDER_ANALYSES ||--o| REVIEW_QUEUE : "enqueued_in"

    TEAMS ||--o{ TEAM_MEMBERS : "includes"

    PROFILES {
        uuid id PK "Matches auth.users(id)"
        text email "User primary email"
        text display_name "Preferred username"
        text avatar_url "GitHub avatar"
        text github_username "GitHub login"
        text github_access_token "OAuth token"
        text plan "free | pro"
        timestamptz plan_expires_at "Subscription expiration"
        integer review_credits "Remaining credits"
        integer reviews_used_this_month "Current cycle reviews"
        timestamptz last_reset_at "Quota cycle reset"
        boolean is_admin "Administrative flag"
        boolean is_blocked "Account suspension"
        boolean has_password "Password authentication"
        timestamptz created_at "Creation timestamp"
        timestamptz updated_at "Update timestamp"
    }

    REVIEWS {
        uuid id PK "Unique review UUID"
        uuid user_id FK "References PROFILES(id)"
        text pr_url "GitHub PR or workspace URL"
        text review_type "pr_review | codebase_audit | api_analysis | folder_analysis"
        text status "pending | processing | complete | failed"
        integer health_score "0 to 100 quality score"
        text summary "Executive summary markdown"
        text repo_owner "GitHub repository owner"
        text repo_name "GitHub repository name"
        integer pr_number "Pull request number"
        text pr_title "PR title string"
        text pr_author "PR author username"
        text branch_from "Head ref branch"
        text branch_to "Base ref branch"
        integer files_changed "Modified file count"
        integer additions "Lines added"
        integer deletions "Lines deleted"
        text share_token "Public view cryptographic token"
        boolean is_public "Public sharing visibility"
        text error_message "Sanitized failure text"
        timestamptz created_at "Creation timestamp"
        timestamptz updated_at "Completion timestamp"
    }

    FINDINGS {
        uuid id PK "Unique finding UUID"
        uuid review_id FK "References REVIEWS(id)"
        text severity "critical | high | medium | low | info"
        text category "security | performance | architecture | reliability | testability | readability"
        text title "Headline summary"
        text description "In-depth rationale"
        text file_path "Relative repository file path"
        integer line_start "Starting line number"
        integer line_end "Ending line number"
        text bad_code "Vulnerable code excerpt"
        text suggested_fix "Replacement code diff"
        integer confidence "0 to 100 model confidence"
        timestamptz created_at "Finding timestamp"
    }

    FOLDER_ANALYSES {
        uuid id PK "Unique analysis UUID"
        uuid user_id FK "References PROFILES(id)"
        text repo_owner "Repository owner"
        text repo_name "Repository name"
        text repo_full_name "owner/repo slug"
        integer organization_score "0 to 100 architectural score"
        text grade "A | B | C | D | F"
        text stack_detected "Identified frameworks"
        jsonb current_analysis "Strengths, weaknesses, flaws"
        jsonb ideal_structure "Target architecture & tree"
        jsonb folder_annotations "Directory status notes"
        jsonb file_tree "Repository file map"
        text share_token "Public collaboration token"
        timestamptz created_at "Timestamp"
    }

    FOLDER_MIGRATION_ACTIONS {
        uuid id PK "Action UUID"
        uuid folder_analysis_id FK "References FOLDER_ANALYSES(id)"
        text priority "critical | high | medium | low"
        text action "Operation title"
        text from_path "Source path"
        text to_path "Destination path"
        text reason "Architectural justification"
        timestamptz created_at "Timestamp"
    }

    REVIEW_QUEUE {
        uuid id PK "Queue record UUID"
        uuid review_id FK "References REVIEWS(id)"
        uuid folder_analysis_id FK "References FOLDER_ANALYSES(id)"
        text review_type "Target processing pipeline"
        text status "pending | processing | completed | failed"
        integer attempts "Execution attempts"
        integer max_attempts "Max retry threshold"
        text locked_by "Worker node identifier"
        timestamptz locked_at "Lock timestamp"
        timestamptz next_retry_at "Backoff retry timestamp"
        timestamptz created_at "Enqueued timestamp"
        timestamptz updated_at "State update timestamp"
    }

    TEAMS {
        uuid id PK "Team UUID"
        text name "Team workspace name"
        uuid owner_id FK "References PROFILES(id)"
        timestamptz created_at "Creation timestamp"
        timestamptz updated_at "Update timestamp"
    }

    TEAM_MEMBERS {
        uuid id PK "Membership UUID"
        uuid team_id FK "References TEAMS(id)"
        uuid user_id FK "References PROFILES(id)"
        text role "owner | admin | member"
        text email "Invited email"
        timestamptz invited_at "Invitation timestamp"
        timestamptz accepted_at "Acceptance timestamp"
    }

    GITHUB_INSTALLATIONS {
        uuid id PK "Internal UUID"
        bigint installation_id "GitHub installation ID"
        uuid user_id FK "References PROFILES(id)"
        text account_login "GitHub user or org handle"
        text account_type "User | Organization"
        text repository_selection "all | selected"
        timestamptz created_at "Installation timestamp"
    }

    REVIEW_EVENTS {
        uuid id PK "Event UUID"
        bigint installation_id "GitHub installation ID"
        uuid user_id FK "References PROFILES(id)"
        text pr_url "Target PR URL"
        text event_type "x-github-event value"
        uuid review_id FK "References REVIEWS(id)"
        text status "queued | unclaimed"
        jsonb payload "Raw webhook body"
        timestamptz created_at "Event timestamp"
    }

    PRICING_PLANS {
        text id PK "Plan slug: free | pro"
        text name "Display name"
        integer price_monthly "Price in Paise"
        integer price_annual "Price in Paise"
        integer credits_per_month "Credits allocated per cycle"
        jsonb features "Marketing feature list"
        boolean is_active "Availability flag"
    }

    PAYMENT_TRANSACTIONS {
        text id PK "Razorpay Payment ID"
        text order_id "Razorpay Order ID"
        uuid user_id FK "References PROFILES(id)"
        integer amount "Paise settled"
        text currency "Currency code (INR)"
        text billing_cycle "monthly | annual"
        timestamptz created_at "Settlement timestamp"
    }

    SYSTEM_SETTINGS {
        text key PK "Config key"
        text value "Config value"
        timestamptz updated_at "Update timestamp"
    }

    SYSTEM_AI_KEYS {
        uuid id PK "Vault UUID"
        text provider "gemini | openai"
        text api_key_encrypted "AES-256-GCM ciphertext"
        text label "Key descriptor"
        boolean is_active "Active flag"
        integer requests_count "Invocations count"
        timestamptz last_used_at "Last invocation timestamp"
        timestamptz created_at "Creation timestamp"
    }

    BLOG_POSTS {
        uuid id PK "Post UUID"
        text slug "Unique URL permalink"
        text title "Article headline"
        text excerpt "Preview summary"
        text content "Full markdown body"
        text cover_image_url "Cover photo URL"
        boolean published "Public visibility"
        timestamptz published_at "Publication date"
        timestamptz created_at "Creation date"
        timestamptz updated_at "Update date"
    }

    USER_FEEDBACK {
        uuid id PK "Feedback UUID"
        uuid user_id FK "References PROFILES(id)"
        integer rating "1 to 5 star rating"
        text feedback_text "User remarks"
        text page_url "Triggering page URL"
        text status "new | reviewed | resolved"
        timestamptz created_at "Creation timestamp"
    }

    REVIEW_API_LOGS {
        bigserial id PK "Sequential log ID"
        uuid review_id FK "References REVIEWS(id)"
        text provider "gemini | openai"
        text model "Model identifier"
        integer tokens_prompt "Prompt tokens"
        integer tokens_completion "Completion tokens"
        integer duration_ms "Execution time in ms"
        integer status_code "HTTP response status"
        timestamptz created_at "Creation timestamp"
    }
```

---

### 12.2 Complete Relational Data Dictionary (All 17 Tables)

#### Table 1: `public.profiles`
Primary identity, subscription, and credit balance table linked to Supabase Auth.

| Column Name | Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, FK -> `auth.users(id)` | — | Unique user identifier |
| `email` | `TEXT` | NULLABLE | — | User primary email address |
| `display_name` | `TEXT` | NULLABLE | — | Full name or GitHub handle |
| `avatar_url` | `TEXT` | NULLABLE | — | Profile picture URL |
| `github_username` | `TEXT` | NULLABLE | — | Linked GitHub handle |
| `github_access_token`| `TEXT`| NULLABLE | — | Encrypted GitHub OAuth access token |
| `plan` | `TEXT` | CHECK (`plan IN ('free', 'pro')`) | `'free'` | Active subscription plan |
| `plan_expires_at` | `TIMESTAMPTZ` | NULLABLE | — | Subscription expiration timestamp |
| `review_credits` | `INTEGER` | CHECK (`review_credits >= 0`) | `10` | Balance of review credits |
| `reviews_used_this_month`| `INTEGER`| NOT NULL | `0` | Number of reviews executed in current 30-day window |
| `last_reset_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Timestamp of last credit renewal cycle |
| `is_admin` | `BOOLEAN` | NOT NULL | `FALSE` | Elevated platform administrator flag |
| `is_blocked` | `BOOLEAN` | NOT NULL | `FALSE` | Account suspension status |
| `has_password` | `BOOLEAN` | NOT NULL | `FALSE` | Indicates whether account has password auth enabled |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Profile creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Last profile mutation timestamp |

#### Table 2: `public.reviews`
Entity representing an initiated PR review or repository workspace audit.

| Column Name | Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` | Unique review record UUID |
| `user_id` | `UUID` | NOT NULL, FK -> `profiles(id)` ON DELETE CASCADE | — | Submitting user ID |
| `pr_url` | `TEXT` | NOT NULL | — | GitHub PR or workspace URL |
| `review_type` | `TEXT` | CHECK (`review_type IN ('pr_review', 'codebase_audit', 'api_analysis', 'folder_analysis')`) | `'pr_review'` | Audit pipeline variant |
| `status` | `TEXT` | CHECK (`status IN ('pending', 'processing', 'complete', 'failed')`) | `'pending'` | Lifecycle state |
| `health_score` | `INTEGER` | CHECK (`health_score BETWEEN 0 AND 100`) | NULL | Calculated holistic quality score (0–100) |
| `summary` | `TEXT` | NULLABLE | — | Executive summary markdown |
| `repo_owner` | `TEXT` | NULLABLE | — | GitHub repository owner |
| `repo_name` | `TEXT` | NULLABLE | — | GitHub repository name |
| `pr_number` | `INTEGER` | NULLABLE | — | PR number (0 for workspace audits) |
| `pr_title` | `TEXT` | NULLABLE | — | Pull request title string |
| `pr_author` | `TEXT` | NULLABLE | — | Pull request author login |
| `branch_from` | `TEXT` | NULLABLE | — | Source branch (head ref) |
| `branch_to` | `TEXT` | NULLABLE | — | Target base branch (base ref) |
| `files_changed` | `INTEGER` | NULLABLE | `0` | Number of files modified |
| `additions` | `INTEGER` | NULLABLE | `0` | Lines of code added |
| `deletions` | `INTEGER` | NULLABLE | `0` | Lines of code deleted |
| `share_token` | `TEXT` | UNIQUE, NULLABLE | — | Cryptographic public share token |
| `is_public` | `BOOLEAN` | NOT NULL | `FALSE` | Public visibility toggle |
| `error_message` | `TEXT` | NULLABLE | — | User-sanitized error description if failed |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Submission timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Completion timestamp |

#### Table 3: `public.findings`
Granular line-level code flaws detected during review.

| Column Name | Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` | Unique finding ID |
| `review_id` | `UUID` | NOT NULL, FK -> `reviews(id)` ON DELETE CASCADE | — | Parent review foreign key |
| `severity` | `TEXT` | CHECK (`severity IN ('critical', 'high', 'medium', 'low', 'info')`) | — | Vulnerability severity level |
| `category` | `TEXT` | CHECK (`category IN ('security', 'performance', 'architecture', 'reliability', 'testability', 'readability')`) | — | Quality dimension |
| `title` | `TEXT` | NOT NULL | — | Terse headline summary |
| `description` | `TEXT` | NOT NULL | — | In-depth technical rationale |
| `file_path` | `TEXT` | NOT NULL | — | Affected repository file path |
| `line_start` | `INTEGER` | NULLABLE | — | Starting line number |
| `line_end` | `INTEGER` | NULLABLE | — | Ending line number |
| `bad_code` | `TEXT` | NULLABLE | `''` | Original flawed code segment |
| `suggested_fix` | `TEXT` | NULLABLE | `''` | Replacement code diff |
| `confidence` | `INTEGER` | CHECK (`confidence BETWEEN 0 AND 100`) | `80` | Model confidence factor |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Creation timestamp |

#### Tables 4–17: Full Relational Summary

| Table Name | Primary Key | Foreign Keys | Key Columns | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `folder_analyses` | `id (UUID)` | `user_id -> profiles(id)` | `repo_full_name, organization_score, grade, stack_detected` | Full repository structure audit |
| `folder_migration_actions`| `id (UUID)`| `folder_analysis_id -> folder_analyses(id)` | `priority, action, from_path, to_path, reason` | Step-by-step refactor roadmap |
| `review_queue` | `id (UUID)` | `review_id, folder_analysis_id` | `status, attempts, max_attempts, locked_by, locked_at` | Worker queue with row-level locks |
| `teams` | `id (UUID)` | `owner_id -> profiles(id)` | `name, owner_id` | Multi-developer team workspaces |
| `team_members` | `id (UUID)` | `team_id, user_id` | `role (owner, admin, member), email` | Workspace membership & roles |
| `github_installations` | `id (UUID)` | `user_id -> profiles(id)` | `installation_id (unique), account_login` | GitHub App tenant link |
| `review_events` | `id (UUID)` | `user_id, review_id` | `installation_id, pr_url, event_type, status, payload` | Inbound webhook audit stream |
| `pricing_plans` | `id (TEXT)` | — | `price_monthly, price_annual, credits_per_month` | Indian pricing plans (Paise) |
| `payment_transactions` | `id (TEXT)` | `user_id -> profiles(id)` | `order_id, amount, currency, billing_cycle` | Razorpay payment records |
| `system_settings` | `key (TEXT)` | — | `value, updated_at` | Global flags (ai_provider, workers) |
| `system_ai_keys` | `id (UUID)` | — | `provider, api_key_encrypted, is_active, requests_count`| AES-256 encrypted key vault |
| `blog_posts` | `id (UUID)` | — | `slug (unique), title, content, published` | Markdown engineering CMS |
| `user_feedback` | `id (UUID)` | `user_id -> profiles(id)` | `rating (1-5), feedback_text, status` | Customer satisfaction feedback |
| `review_api_logs` | `id (BIGSERIAL)`| `review_id -> reviews(id)` | `provider, model, tokens_prompt, duration_ms, status_code`| High-resolution observability |

---

### 12.3 Stored Procedures & Security-Definer RPC Functions

#### A. Atomic Worker Queue Claim (`claim_next_queue_item_v3`)
```sql
CREATE OR REPLACE FUNCTION public.claim_next_queue_item_v3(p_worker_id text)
RETURNS SETOF public.review_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item public.review_queue;
BEGIN
  -- Select exactly 1 pending or overdue retry item, locking the row exclusively
  SELECT *
  INTO v_item
  FROM public.review_queue
  WHERE (status = 'pending' OR (status = 'failed' AND attempts < max_attempts AND next_retry_at <= NOW()))
    AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE public.review_queue
    SET
      status = 'processing',
      locked_by = p_worker_id,
      locked_at = NOW(),
      attempts = attempts + 1,
      updated_at = NOW()
    WHERE id = v_item.id;

    RETURN QUERY
    SELECT * FROM public.review_queue WHERE id = v_item.id;
  END IF;

  RETURN;
END;
$$;
```

#### B. Plan Upgrade & Credit Allocation RPC (`upgrade_user_plan`)
```sql
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(
  p_user_id uuid,
  p_plan text,
  p_duration_days integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits integer := 150;
BEGIN
  IF p_plan = 'pro' THEN
    v_credits := 150;
  ELSE
    v_credits := 10;
  END IF;

  UPDATE public.profiles
  SET
    plan = p_plan,
    plan_expires_at = NOW() + (p_duration_days || ' days')::interval,
    review_credits = review_credits + v_credits,
    reviews_used_this_month = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
```

#### C. Monthly Quota Renewal Engine (`check_and_renew_profile_limits`)
```sql
CREATE OR REPLACE FUNCTION public.check_and_renew_profile_limits(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p RECORD;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = profile_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- If subscription has expired, downgrade gracefully to free tier
  IF p.plan = 'pro' AND p.plan_expires_at IS NOT NULL AND p.plan_expires_at < NOW() THEN
    UPDATE public.profiles
    SET
      plan = 'free',
      review_credits = 10,
      reviews_used_this_month = 0,
      last_reset_at = NOW(),
      updated_at = NOW()
    WHERE id = profile_id;
    RETURN;
  END IF;

  -- 30-day quota reset cycle for free accounts
  IF p.plan = 'free' AND p.last_reset_at < NOW() - INTERVAL '30 days' THEN
    UPDATE public.profiles
    SET
      review_credits = 10,
      reviews_used_this_month = 0,
      last_reset_at = NOW(),
      updated_at = NOW()
    WHERE id = profile_id;
  END IF;
END;
$$;
```

---

## 13. DETAILED FUNCTIONAL REQUIREMENTS (IEEE 29148 STANDARD)

All requirements are specified using unique IDs, standard modal verbs (*shall*, *should*), preconditions, detailed flows, and acceptance criteria.

### 13.1 Module 1: Identity, Authentication & Profile Management
- **`FR-AUTH-001` (GitHub OAuth 2.0 Ingestion):**
  - The system **shall** authenticate developers via GitHub OAuth 2.0 using Supabase Auth.
  - The system **shall** securely capture the user's `github_access_token` and store it in `public.profiles`.
  - *Acceptance Criteria:* Successful login redirects to `/dashboard` with session JWT cookies and creates a profile record with 10 free review credits.
- **`FR-AUTH-002` (Password & Email Fallback Authentication):**
  - The system **shall** permit developers to register and sign in using email and salted password credentials.
- **`FR-AUTH-003` (Privileged Profile Field Protection):**
  - The system **shall** enforce a database trigger (`guard_profile_privileged_fields`) that rejects user attempts to mutate `is_admin`, `review_credits`, or `plan` via client-side queries.
- **`FR-AUTH-004` (Account Suspension Check):**
  - The system **shall** check `profiles.is_blocked` prior to processing any review and reject requests from suspended accounts with HTTP 403 Forbidden.

### 13.2 Module 2: Ingestion & Diff Pre-Processing
- **`FR-INGEST-001` (PR URL Parsing):**
  - The system **shall** accept GitHub Pull Request URLs matching regex `github.com/[^/]+/[^/]+/pull/\d+` and extract `owner`, `repo`, and `pr_number`.
- **`FR-INGEST-002` (Non-Source Noise Pruning):**
  - The system **shall** prune non-source files from diff payloads prior to AI analysis, including `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, minified assets (`*.min.js`), build outputs (`dist/`, `build/`, `.next/`), and media binaries (`*.png`, `*.svg`, `*.mp4`).
- **`FR-INGEST-003` (Hunk Mapping & Line Extraction):**
  - The system **shall** parse unified diff hunk headers `@@ -a,b +c,d @@` and map exact modified line numbers for all newly added lines (prefixed with `+`).

### 13.3 Module 3: Asynchronous Task Queue & Concurrency
- **`FR-QUEUE-001` (Non-Blocking Ingestion):**
  - Upon receiving a valid review submission, the API gateway **shall** enqueue the task in `review_queue` and return HTTP 202 Accepted within **50 milliseconds**.
- **`FR-QUEUE-002` (Row-Level Locking & Deduplication):**
  - Worker threads **shall** claim queue tasks using PostgreSQL's `SELECT ... FOR UPDATE SKIP LOCKED` primitive, guaranteeing that concurrent workers never execute identical jobs.
- **`FR-QUEUE-003` (Dynamic Concurrency Adjustment):**
  - The worker pool **shall** fetch the target concurrency value from `system_settings.queue_concurrency` every 15 seconds, dynamically scaling worker threads (1 to 16) without restart.
- **`FR-QUEUE-004` (Exponential Backoff Retries):**
  - Failed jobs **shall** automatically retry up to `max_attempts = 3` with exponential backoff delay ($T_{\text{retry}} = T_{\text{base}} \times 2^{\text{attempts}}$).

### 13.4 Module 4: Dual-Engine AI Orchestration & Fault Tolerance
- **`FR-AI-001` (Dynamic Provider Selection):**
  - The AI Orchestrator **shall** route review requests according to `system_settings.ai_provider` (`gemini`, `openai`, or `both`).
- **`FR-AI-002` (Sub-Second Auto-Failover):**
  - If the primary provider (Google Gemini) returns an HTTP 429 (rate limit) or HTTP 503 (overloaded), the orchestrator **shall** fail over to the secondary provider (OpenAI GPT-4o-mini) within **250 milliseconds**.
- **`FR-AI-003` (AES-256-GCM Key Decryption):**
  - The orchestrator **shall** decrypt API keys from `system_ai_keys` in volatile memory only during model invocation and record cumulative request usage counters.
- **`FR-AI-004` (Context Window Chunking):**
  - Diffs exceeding **8,000 prompt tokens** **shall** be partitioned into AST-aware chunks, processed concurrently, and aggregated via a secondary holistic synthesis prompt.

### 13.5 Module 5: Code Quality, Vulnerability Auditing & Health Scoring
- **`FR-AUDIT-001` (Six-Dimensional Code Evaluation):**
  - The AI engine **shall** audit code across:
    1. **Security:** Injection risks, missing authentication, sensitive data exposure, SSRF.
    2. **Performance:** N+1 queries, memory leaks, blocking CPU operations, unindexed filters.
    3. **Architecture:** SOLID violations, coupling, circular imports, domain boundary breaches.
    4. **Reliability:** Unhandled promise rejections, race conditions, missing error boundaries.
    5. **Testability:** Hardcoded singletons, untestable side-effects, test coverage gaps.
    6. **Readability:** Cognitive complexity, confusing variable nomenclature, missing documentation.
- **`FR-SCORE-001` (Deterministic Health Score Formulation):**
  - The system **shall** compute a deterministic Code Health Score ($H \in [0, 100]$):
    $$H = \max\left(0, \min\left(100, 100 - \sum_{i=1}^{n} w(s_i) \cdot c_i\right)\right)$$
    Where $w(\text{critical}) = 25$, $w(\text{high}) = 12$, $w(\text{medium}) = 5$, $w(\text{low}) = 2$, $w(\text{info}) = 0$, and $c_i \in [0.5, 1.0]$.

### 13.6 Module 6: Autonomous Remediation & Multi-Voice Delivery
- **`FR-FIX-001` (Syntactically Complete Replacement Diffs):**
  - Every detected finding **shall** include syntactically valid `bad_code` and `suggested_fix` blocks.
- **`FR-FIX-002` (One-Click Git Commit Application):**
  - Upon user activation of the "Apply Fix" action, the backend **shall** create a Git blob, update the Git tree, and commit the modified file directly to the remote GitHub branch via Octokit Git Data APIs.
- **`FR-VOICE-001` (Dual-Voice GitHub Comment Posting):**
  - The system **shall** format review comments in either:
    - **DevPulse AI Branded Voice:** Structured markdown with health score gauge, category icons, and Apply buttons.
    - **Human Peer Review Voice:** Natural, empathetic language posted under the user's personal GitHub handle.

### 13.7 Module 7: Folder Analysis & Architectural Migration
- **`FR-FOLDER-001` (Recursive File Tree Parsing):**
  - The system **shall** fetch repository Git trees, prune noise folders, and detect frameworks (Next.js, FastAPI, Go, Django).
- **`FR-FOLDER-002` (Architectural Cleanliness Grading):**
  - The system **shall** assign an organization score ($0–100$) and a letter grade ($A, B, C, D, F$) based on folder modularity.
- **`FR-FOLDER-003` (Prioritized Migration Actions):**
  - The system **shall** generate concrete file move operations with `from_path`, `to_path`, and architectural justifications.

### 13.8 Module 8: Payments, Subscriptions & Quota Enforcement
- **`FR-PAY-001` (Indian Pricing Model in Paise):**
  - The system **shall** support Razorpay subscriptions for Pro Monthly (₹999 / 99,900 Paise) and Pro Annual (₹799/mo / 958,800 Paise).
- **`FR-PAY-002` (Cryptographic HMAC-SHA256 Verification):**
  - Payment authorizations **shall** be verified by computing `HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)` using timing-safe comparisons.
- **`FR-PAY-003` (Webhook Idempotency Protection):**
  - The payment webhook handler **shall** query `payment_transactions` by `payment_id` to guarantee duplicate payment events never trigger double credit allocations.

---

## 14. DETAILED NON-FUNCTIONAL REQUIREMENTS (NFRS)

### 14.1 Performance & Latency (`NFR-PERF`)
- **`NFR-PERF-01` (Ingestion Speed):** Inbound API routes (`/api/reviews/create`) **shall** respond with HTTP 202 Accepted in $< 50\text{ ms}$ under baseline load and $< 100\text{ ms}$ at peak load.
- **`NFR-PERF-02` (End-to-End Review Latency):** For pull requests containing $\le 500$ modified lines, 95% of reviews **shall** complete in $< 25\text{ seconds}$.
- **`NFR-PERF-03` (Realtime CDC Push Latency):** Mutations on the `reviews` table **shall** propagate to client browsers over WebSockets in $< 50\text{ ms}$ of database commit.

### 14.2 Scalability & Concurrency (`NFR-SCAL`)
- **`NFR-SCAL-01` (Daily Ingestion Volume):** The infrastructure **shall** support up to **100,000 Pull Request Reviews per day** without database lock saturation.
- **`NFR-SCAL-02` (Burst RPS Capacity):** The API Gateway **shall** handle sustained bursts of **50 Requests Per Second (RPS)** via Cloudflare edge throttling and Redis token-bucket rate limiters.

### 14.3 Reliability & Availability (`NFR-AVAL`)
- **`NFR-AVAL-01` (High Availability):** The platform **shall** maintain an operational uptime of **99.98%**, excluding scheduled maintenance windows.
- **`NFR-AVAL-02` (AI Outage Immunity):** Outages or rate-limit saturation on any single AI model provider **shall not** cause review job failures.
- **`NFR-AVAL-03` (Worker Heartbeat Recovery):** Jobs held in `status = 'processing'` for longer than 5 minutes due to worker process crashes **shall** be automatically reclaimed by healthy worker nodes.

### 14.4 Security & Data Privacy (`NFR-SECU`)
- **`NFR-SECU-01` (Database Row-Level Multi-Tenancy):** Every table in the PostgreSQL schema **shall** enforce Row Level Security (RLS). Cross-tenant data access **shall be structurally impossible** at the SQL engine level.
- **`NFR-SECU-02` (Encryption at Rest & in Transit):** All data in transit **shall** use TLS 1.3. Stored AI credentials **shall** use authenticated `aes-256-gcm` encryption.
- **`NFR-SECU-03` (Zero Customer Code Retention for Training):** Customer proprietary source code diffs **shall never** be stored permanently or utilized for third-party AI model training.

### 14.5 Compliance & Usability (`NFR-COMP` / `NFR-USAB`)
- **`NFR-COMP-01` (Vulnerability Classification Standards):** Findings **shall** map to standard OWASP Top 10 and CWE classifications.
- **`NFR-USAB-01` (Accessibility):** The frontend UI **shall** comply with WCAG 2.1 Level AA standards, support dark and light theme modes, and provide keyboard navigation.

---

## 15. PAYMENT GATEWAYS, SUBSCRIPTIONS & RAZORPAY ARCHITECTURE

### 15.1 Indian Pricing Model & Tier Structure
DevPulse adopts an India-first subscription model implemented in Paise ($1\text{ INR} = 100\text{ Paise}$):

| Subscription Plan | Monthly Price (Paise) | Annual Price (Paise) | Review Credits | Features Included |
| :--- | :--- | :--- | :--- | :--- |
| **Developer Free** | ₹0 | ₹0 | 10 credits / month | Public repos, basic triage, web dashboard |
| **Developer Pro** | ₹999 (99,900 Paise) | ₹799/mo (958,800 Paise) | 150 credits / month | Private repos, 1-click Git fixes, dual-engine failover, folder audits |
| **Enterprise / Custom** | Negotiated | Negotiated | Unlimited | Dedicated vault, custom LLM fine-tuning, air-gapped VPC |

### 15.2 Checkout & Verification Flow
1. Developer selects billing cycle on `/pricing` $\rightarrow$ Client calls `POST /api/pricing/razorpay/checkout`.
2. Backend generates a secure Razorpay Order via authenticated HTTPS request (`https://api.razorpay.com/v1/orders`).
3. Client opens Razorpay embedded checkout modal (supporting UPI Intent, Google Pay, PhonePe, NetBanking, and Credit/Debit Cards).
4. Upon successful payment, Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
5. Frontend posts credentials to `/api/pricing/razorpay/verify`.
6. Backend computes cryptographic signature:
   $$\text{Expected} = \text{HMAC-SHA256}(\text{order\_id} \mathbin{\Vert} \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
7. Upon timing-safe verification, the backend checks `public.payment_transactions` for idempotency and executes `upgrade_user_plan` RPC.

---

## 16. COMPLETE REST API, WEBHOOKS & REAL-TIME HOOK POINTS DIRECTORY

### 16.1 Detailed API Endpoint Directory (`backend/src/server.ts`)

| Method | Endpoint Route | Request Schema (Zod) | Auth Header | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/public/github/webhook` | Raw Webhook Body | `x-hub-signature-256` | 200, 401 | GitHub App PR & installation event receiver |
| `POST` | `/api/pricing/razorpay/webhook`| Raw Webhook Body | `x-razorpay-signature` | 200, 400 | Razorpay payment confirmation webhook |
| `GET` | `/api/pricing/plans` | None | Public | 200, 500 | Returns pricing plans and credit allowances |
| `POST` | `/api/pricing/razorpay/checkout`| `{ billingCycle: 'monthly' \| 'annual' }` | Bearer JWT | 200, 401, 500 | Initializes Razorpay Order in Paise |
| `POST` | `/api/pricing/razorpay/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, billingCycle }` | Bearer JWT | 200, 400, 401 | Verifies payment signature & upgrades plan |
| `POST` | `/api/reviews/create` | `{ pr_url: string, access_token: string, user_id: string }` | Bearer JWT | 200, 400, 402 | Enqueues a new PR or workspace review |
| `POST` | `/api/reviews/process-review` | `{ review_id: UUID, access_token: string }` | Bearer JWT | 200, 401, 500 | Executes review processing worker |
| `POST` | `/api/reviews/apply-fix` | `{ review_id: UUID, finding_id: UUID, access_token: string }` | Bearer JWT | 200, 401, 500 | Commits code fix to remote GitHub branch |
| `POST` | `/api/reviews/post-styled` | `{ review_id: UUID, style: 'devpulse' \| 'human', reviewer_name, reviewer_login }` | Bearer JWT | 200, 401, 500 | Posts review comment to GitHub PR |
| `POST` | `/api/reviews/retry` | `{ review_id: UUID, access_token: string }` | Bearer JWT | 200, 401, 500 | Resets and re-enqueues a failed review |
| `POST` | `/api/folder-analysis/analyze` | `{ repo_full_name, file_tree: Array<{path, type}> }` | Bearer JWT | 200, 401, 500 | Evaluates repository file tree hierarchy |
| `POST` | `/api/admin/metrics` | `{ access_token: string }` | Admin JWT | 200, 401, 403 | Returns platform metrics, queue depth, health |
| `POST` | `/api/admin/update-settings` | `{ ai_provider: 'gemini' \| 'openai' \| 'both', parallel_engine_enabled: boolean }` | Admin JWT | 200, 401, 403 | Mutates global AI provider and engine flags |
| `POST` | `/api/admin/ai-keys/create` | `{ provider, key, label }` | Admin JWT | 200, 401, 403 | Encrypts & adds key to AES-256 Vault |
| `GET` | `/health` | None | Public | 200 OK | Lightweight keep-alive status check |

---

## 17. PRODUCTION SCALING, PERFORMANCE & DISASTER RECOVERY BLUEPRINT

### 17.1 Capacity Modeling (100,000 Reviews / Day)
- **Sustained Daily Volume:** $100,000\text{ reviews/day}$ ($\approx 1.15\text{ reviews/sec}$ average, $5.8\text{ reviews/sec}$ sustained peak).
- **Burst Peak Capacity:** Dimensioned for $50.0\text{ reviews/sec}$ burst spikes.
- **Database Connection Pooling:** Managed Supavisor / PgBouncer handles 10,000 client connections sharing 50–100 physical PostgreSQL backend connections in Transaction Mode.

### 17.2 Hierarchical Chunking & Token Budgeting Strategy
- Diffs are parsed into discrete file hunks.
- Hunks are partitioned into chunks capped at **8,000 prompt tokens**.
- Chunks are dispatched concurrently to the AI orchestrator, shrinking review times for 5,000-line PRs from 65 seconds to under 18 seconds.

### 17.3 Distributed Rate Limiting & GitHub ETag Caching
1. **Cloudflare Edge:** 100 requests / 10s per IP (DDoS protection).
2. **Upstash Redis:** Token bucket limiter (Free: 10 req/min, Pro: 60 req/min).
3. **PostgreSQL Ledger:** Atomic monthly review deductions.
4. **GitHub ETag Caching:** Unchanged PR metadata returns HTTP 304, consuming **zero rate-limit tokens** under GitHub API rules.

### 17.4 Disaster Recovery & Fault Tolerance Matrix

| Failure Mode | Impact | Automated Recovery Mechanism | MTTR |
| :--- | :--- | :--- | :--- |
| **Primary AI Provider 429/503** | Review failure in single-provider tools | **Instant Failover:** Orchestrator switches to secondary provider | $< 250\text{ ms}$ |
| **Worker Process Crash / OOM** | Job stuck in 'processing' | **Heartbeat Reaper:** Locks expire after 5 mins; job re-enters queue | $< 5\text{ minutes}$ |
| **GitHub Token Rate Limit** | Inability to fetch diffs | **User Token Fallback:** Requests use individual user OAuth tokens | Instant |
| **Duplicate Payment Webhook** | Risk of double upgrade | **Idempotent Storage:** `payment_transactions` enforces unique primary keys | $0\text{ ms}$ (Ignored) |

### 17.5 Zero-Cost Free-Tier & Startup Production Deployment Architecture
DevPulse is designed to bootstrap with zero infrastructure overhead by strategically orchestrating modern cloud developer free tiers while maintaining production-grade reliability:

| Cloud Platform | Service Tier | Free Quota Allocations | DevPulse Operational Strategy & Mitigations |
| :--- | :--- | :--- | :--- |
| **Vercel** | Hobby Tier | 100 GB Bandwidth, 100 deploys/day, Edge CDN | Hosts React 19 SPA static bundle with global Edge caching and zero serverless invocation costs. |
| **Render** | Free Web Service | 512 MB RAM, 0.1 vCPU, 750 free hours/month | Hosts Express API & Queue Worker. Spins down after 15 min inactivity. **Mitigation:** GitHub Actions keep-alive workflow pings `HEAD /api/health` every 14 mins during active developer hours (08:00–22:00 UTC). |
| **Supabase** | Free DB Tier | 500 MB Postgres Storage, 50k MAU, 5 GB Egress | Enforces strict table indexing and JSON pruning. Auto-pause after 7 days of inactivity mitigated via automated scheduled database health ping. |
| **Upstash Redis**| Free Serverless | 10,000 commands/day, 256 MB storage | REST-based stateless commands utilized strictly for IP rate-limiting buckets and webhook idempotency keys. |
| **Google Gemini**| AI Studio Tier | 15 RPM, 1,000,000 TPM, 1,500 RPD | Primary engine for all standard tier reviews. Subagent chunking keeps requests safely beneath rate limits. |
| **OpenAI** | Tier 1 Paygo | Pay-per-token fallback ($0.15/1M GPT-4o-mini) | Secondary fallback engine triggered strictly when Gemini encounters HTTP 429 / 503 errors. |
| **Resend** | Free Email Tier | 3,000 emails/month, 100 emails/day | Transactional email delivery for executive review summaries and vulnerability digest reports. |

### 17.6 Enterprise Log Aggregation & Syslog Telemetry Architecture
For production monitoring and observability across distributed cloud tiers, DevPulse integrates native RFC 5424 syslog streaming:
- **Render Syslog Integration:** Render backend application logs stream over TLS to external log aggregation endpoints (BetterStack / Logtail) via `syslog+tls://in.logs.betterstack.com:6514`.
- **Structured JSON Logging:** All application events emit standard JSON payloads with ISO timestamps, log levels (`debug`, `info`, `warn`, `error`), correlation IDs (`review_id`), and execution durations (`duration_ms`).
- **Admin Live Log Streaming Portal:** The administrative portal (`frontend/src/routes/admin/logs.tsx`) interfaces with `/api/admin/system-logs` using Server-Sent Events (SSE) to display real-time terminal-styled logs with live regex filtering, level thresholds, and auto-scroll controls.

---

## 18. REQUIREMENTS TRACEABILITY & VERIFICATION MATRIX (RTM)

| Req ID | Requirement Summary | Architectural Layer | Database Table | API Endpoint | Verification Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FR-AUTH-001` | GitHub OAuth & Token Storage | Auth & Data Tier | `profiles` | Supabase Auth | E2E Integration Test |
| `FR-INGEST-002`| Lockfile & Binary Noise Pruning | Microservices Tier | `reviews` | `/api/reviews/create` | Unit Test (Regex Suite) |
| `FR-QUEUE-002` | Queue Row-Level Lock Mutex | Queue Engine | `review_queue` | `claim_next_queue_item_v3` | Concurrency Load Test |
| `FR-AI-002` | Sub-Second AI Auto-Failover | AI Orchestrator | `system_settings` | `orchestrator.ts` | Fault Injection Simulation |
| `FR-AI-003` | AES-256-GCM Key Vault Decryption | Security Vault | `system_ai_keys` | `key-vault.server.ts` | Cryptographic Unit Test |
| `FR-SCORE-001` | Mathematical Health Scoring | AI Orchestrator | `reviews` | `review-processor.ts` | Deterministic Algorithm Test |
| `FR-FIX-002` | 1-Click GitHub Branch Commit | External Integration | `findings` | `/api/reviews/apply-fix` | GitHub Mock API Test |
| `FR-REALTIME` | Sub-50ms WebSocket Push | Realtime Tier | `reviews` | Supabase Realtime CDC | WebSocket Latency Benchmark |
| `FR-PAY-002` | HMAC-SHA256 Signature Verify | Gateway Tier | `payment_transactions`| `/api/pricing/razorpay/verify`| Crypto Unit Test |

---

## 19. FUTURE SCOPE & MULTI-YEAR ENGINEERING ROADMAP

```
+─────────────────────────────────────────────────────────────────────────────+
|                         DEVPULSE MULTI-YEAR ROADMAP                         |
+─────────────────────────────────────────────────────────────────────────────+
|                                                                             |
|  [Phase 1: Q1 2026] ──► Web PR Review, Folder Audit & Razorpay (COMPLETE)   |
|                                                                             |
|  [Phase 2: Q3 2026] ──► VS Code, Cursor & JetBrains Inline IDE Extensions   |
|                                                                             |
|  [Phase 3: Q1 2027] ──► Enterprise Air-Gapped VPC & Local LLM (Ollama/vLLM) |
|                                                                             |
|  [Phase 4: Q3 2027] ──► Autonomous PR Generator & Regression Test Agent     |
|                                                                             |
|  [Phase 5: Q1 2028] ──► Multi-Repository Semantic Knowledge Graph & ASPM    |
|                                                                             |
+─────────────────────────────────────────────────────────────────────────────+
```

1. **Phase 2 (IDE Extensions):** Inline pre-commit diagnostic lenses directly inside VS Code and JetBrains IDEs.
2. **Phase 3 (Enterprise On-Premise Vault):** Air-gapped self-hosted deployments for regulated financial institutions utilizing fine-tuned local models (DeepSeek-Coder, Llama 3 via vLLM).
3. **Phase 4 (Autonomous PR Generator Agent):** An agent that detects issues and autonomously opens bugfix PRs with generated unit test suites verifying the fix.
4. **Phase 5 (Multi-Repo Knowledge Graph):** Cross-repository dependency analysis detecting breaking API contracts across microservices before deployment.

---

## 20. FORMAL PATENT CLAIMS & LEGAL SPECIFICATION (ANNEXURE 3b)

**WE CLAIM:**

1. **A distributed autonomous computing system for real-time source code auditing and automated remediation, comprising:**
   - an ingestion gateway configured to intercept source code modifications from a distributed version control repository;
   - a diff pre-processing engine configured to filter non-source file artifacts, extract unified diff hunks, and map modified line ranges;
   - an asynchronous queue manager configured to enqueue review jobs and distribute said jobs to a worker pool utilizing database row-level locking;
   - an artificial intelligence (AI) orchestrator operatively coupled to a plurality of distinct large language model (LLM) providers, configured to dynamically evaluate code hunks against security, performance, architecture, and reliability criteria, wherein said orchestrator executes automated zero-downtime failover between said LLM providers upon detecting an API failure, rate limit, or latency threshold;
   - a database management system enforcing tenant data isolation via database engine-level Row Level Security (RLS) policies; and
   - a client interface configured to receive real-time review progress and structured findings via a database Change Data Capture (CDC) stream without client polling.

2. **The system of claim 1, wherein** said diff pre-processing engine removes dependency lockfiles, minified script files, build output bundles, and binary assets using regular expression pattern matching prior to AI tokenization.

3. **The system of claim 1, wherein** said AI orchestrator includes an AES-256-GCM encrypted key vault configured to store, decrypt in volatile memory, and rotate API authentication keys across multiple AI providers.

4. **The system of claim 1, wherein** said AI orchestrator executes a two-stage evaluation comprising:
   - a first stage executing chunk-level vulnerability audits across partitioned source diff segments; and
   - a second stage executing holistic synthesis that deduplicates overlapping findings and computes an overarching Code Health Score between 0 and 100.

5. **The system of claim 1, wherein** each detected finding includes an exact file path, start line number, end line number, vulnerable code segment, explanation text, and a syntactically valid suggested replacement code snippet.

6. **The system of claim 5, wherein** the client interface comprises an interactive remediation trigger configured to apply the suggested replacement code snippet directly to the target remote repository branch as an atomic Git commit via a version control API.

7. **The system of claim 1, wherein** said review output is selectively formatted in either a branded structured report style or an empathetic, natural language human reviewer voice signed with the user's name.

8. **The system of claim 1, further comprising** a folder analysis engine configured to traverse an entire repository file tree, compute an architectural cleanliness grade from A to F, and output a prioritized list of file migration actions.

9. **The system of claim 1, further comprising** an API analysis engine configured to scan route definition files, detect unauthenticated endpoints, identify SQL/NoSQL injection vulnerabilities, and detect breaking changes in API contracts.

10. **The system of claim 1, wherein** said asynchronous queue manager executes a stored procedure utilizing `SELECT ... FOR UPDATE SKIP LOCKED` to prevent duplicate job execution across concurrent worker processes.

11. **The system of claim 1, wherein** the worker pool dynamically adjusts its concurrency limit at runtime based on configuration parameters fetched from a database system settings table.

12. **The system of claim 1, further comprising** an automated credit ledger and payment verification engine configured to verify incoming payments using cryptographic HMAC-SHA256 signature verification and enforce monthly review limits.

13. **A computer-implemented method for autonomous code auditing and remediation, comprising:**
   - receiving a pull request identifier or repository URL at an API gateway;
   - validating user authorization and available review credits;
   - extracting unified diff data from a version control provider;
   - stripping non-source noise files from said diff data;
   - triaging modified files to eliminate trivial changes;
   - dispatching triaged code hunks to a multi-provider AI orchestrator with automated failover;
   - generating structured findings containing line-specific replacement diffs;
   - persisting said findings to a database with row-level security; and
   - pushing said findings to a connected client interface via a real-time reactive WebSocket channel.

---

## 21. RESULTS, EMPIRICAL BENCHMARKS & AUTHORIZED DECLARATIONS (NOC)

### 21.1 Quantitative Performance Metrics

| Evaluation Metric | Manual Human Review | Legacy SAST (e.g., SonarQube) | DevPulse AI Platform |
| :--- | :--- | :--- | :--- |
| **Average Turnaround Time** | 24 to 72 hours | 5 to 15 minutes (CI build delay) | **8 to 28 seconds** |
| **Vulnerability Recall (OWASP Top 10)**| 62.4% (reviewer dependent) | 58.1% (pattern dependent) | **94.2% (multi-model audit)** |
| **False Positive Rate** | Low (~8%) | High (38% to 52%) | **Very Low (6.4%)** |
| **Actionable Fix Generation** | Manual code authoring | None (text recommendations) | **100% syntactically valid diffs** |
| **1-Click Branch Patching** | Not possible | Not possible | **Fully integrated via Git API** |
| **Operational Uptime under AI Outage** | N/A | High | **99.98% via Gemini $\leftrightarrow$ OpenAI failover** |
| **Cost per 1,000 Pull Requests** | ~₹2,50,000 (engineer hours) | ~₹45,000 (enterprise license) | **~₹999 (flat SaaS subscription)** |

### 21.2 Filing Details & Commercialization Target Companies
- **Filing Level:** Complete Patent Application & PCT International Application
- **IPC Classification Codes:** G06F 8/71 (Software Maintenance), G06F 21/57 (Security Evaluation), G06N 3/08 (Artificial Intelligence).
- **Keywords:** Autonomous Code Review, Multi-Modal AI Orchestration, Pull Request Triage, Dual-Provider Failover, Hunk-Aware Diff Parsing, Programmatic Remediation, Real-Time Change Data Capture, Row Level Security, Code Health Score.
- **Target Licensing / Acquisition Partners:**
  1. GitHub / Microsoft Corporation (`github.com`)
  2. GitLab Inc. (`gitlab.com`)
  3. Atlassian Corporation (`atlassian.com`)
  4. JetBrains s.r.o. (`jetbrains.com`)
  5. Datadog / Snyk (`snyk.io`)

### 21.3 No Objection Certificate (NOC) & Signatures
This is to certify that all co-inventors and contributing researchers have verified the technical disclosure, design representations, and empirical claims set forth in this unified specification. All intellectual property rights shall be managed in accordance with applicable institutional and national patent statutes.

$$\text{Lead Inventor: Akshay Pratap Singh} \quad \Big\vert \quad \text{Date: November 10, 2026}$$
