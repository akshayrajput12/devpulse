Build a complete, production-ready Next.js 14 landing page for "DevPulse" — an AI-powered code review SaaS. Dark mode only. No light mode toggle. This page must feel like Linear + Vercel + GitHub had a baby — premium, technical, and conversion-focused. Every interaction should delight a developer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK FOR THIS PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Next.js 14 App Router (or React if single file)
- Framer Motion for ALL animations — no CSS keyframes for complex motion
- Tailwind CSS for utility styling
- shadcn/ui for base components (Badge, Button, Card, Separator, Accordion)
- Lucide React for icons
- next/font for Inter + JetBrains Mono (monospace for code blocks)
- All scroll effects: IntersectionObserver + Framer Motion useScroll/useTransform

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL DESIGN TOKENS (define in :root / tailwind.config)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Background layers:
  --bg-base:      #0D1117   (GitHub dark, deepest layer)
  --bg-surface:   #161B22   (cards, panels)
  --bg-overlay:   #21262D   (hover states, modals)
  --bg-subtle:    #30363D   (borders, dividers)

Text:
  --text-primary:   #F0F6FC  (headings)
  --text-secondary: #8B949E  (body, descriptions)
  --text-muted:     #484F58  (placeholders, timestamps)
  --text-code:      #79C0FF  (inline code, monospace elements)

Brand accents:
  --accent-blue:    #58A6FF  (primary CTA, links, highlights)
  --accent-purple:  #7C3AED  (gradient end, premium badge)
  --accent-green:   #3FB950  (success states, score high)
  --accent-yellow:  #D29922  (warning severity badges)
  --accent-red:     #F85149  (critical severity badges)
  --accent-orange:  #DB6D28  (medium severity badges)

Gradients:
  --grad-brand:    linear-gradient(135deg, #58A6FF 0%, #7C3AED 100%)
  --grad-glow:     radial-gradient(circle at 50% 50%, rgba(88,166,255,0.15) 0%, transparent 60%)
  --grad-hero-bg:  radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 20%, rgba(88,166,255,0.1) 0%, transparent 50%)

Font sizes: use clamp() for fluid typography
  Display:  clamp(3rem, 7vw, 6rem)
  H1:       clamp(2rem, 5vw, 3.75rem)
  H2:       clamp(1.5rem, 3vw, 2.5rem)
  Body:     1rem / 1.125rem
  Code:     0.875rem (JetBrains Mono)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: NAVIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Fixed top nav, full width
- Default: transparent background
- On scroll past 60px: backdrop-blur(20px) + bg-surface/80 with border-bottom 1px --bg-subtle
  Animate this transition with Framer Motion (opacity + translateY of the border)
- Left: DevPulse wordmark — "Dev" in --text-primary bold + "Pulse" in --accent-blue bold
  Add a small animated pulse dot (●) after "Pulse" that breathes (scale 1→1.3→1, infinite, 2s)
- Center: nav links — Features, How it Works, Pricing, Changelog
  Each link: hover state draws a gradient underline from left (scaleX 0→1, transform-origin left)
- Right:
  - "GitHub" icon button (Lucide Github) — hover rotates 15deg + glow
  - "Sign in" ghost button
  - "Start free review →" filled button with --grad-brand background
    Hover: shimmer sweep animation (moving highlight across button)
    Magnetic button effect: on mouse proximity, button moves slightly toward cursor (max 8px displacement)
- Mobile: hamburger → full-screen overlay menu with staggered link reveal (Framer Motion staggerChildren)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: HERO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full viewport height. This is the most important section — must convert.

BACKGROUND LAYER:
- Animated mesh gradient behind everything: 3 radial gradient orbs (blue, purple, dark-blue) that slowly drift using CSS animation (translateX/Y, 20s loop, no JS needed)
- Subtle grid pattern overlay: CSS background-image repeating grid lines in rgba(48,54,61,0.4) — 40px × 40px squares
- Grid lines fade out toward edges using mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%)

CUSTOM CURSOR:
- Replace default cursor with a small 12px circle (border: 1.5px solid --accent-blue) that follows mouse with spring physics (Framer Motion useSpring)
- On hover over buttons/links: cursor expands to 40px + fills with accent-blue/20 + text inside says "click" in 8px font
- On hover over code blocks: cursor changes to crosshair + "copy" label

ANNOUNCEMENT BADGE (above headline):
- Pill badge: left side has a small pulsing green dot, then gradient text "New —" then normal text "GitHub App now available"
- Subtle gradient border on the pill
- On hover: slight scale(1.02) + glow
- Framer Motion: bounces in from top on page load (y: -20 → 0, opacity 0 → 1)

HEADLINE:
"AI Code Reviews
That Actually Ship."
- "AI Code Reviews" in --text-primary, clamp(3rem, 7vw, 6rem), font-weight 800
- "That Actually Ship." with each word individually highlighted:
  "That" — normal
  "Actually" — normal
  "Ship." — gradient text (--grad-brand applied as background-clip: text)
- Reveal animation: each LINE wipes in with clip-path (inset(0 100% 0 0) → inset(0 0% 0 0)), staggered 150ms apart, triggered on load
- Cursor blink at end of "Ship." — blinking | character that disappears after 2s

SUBHEADLINE:
"Paste a GitHub PR URL. Get a severity-ranked review with line-by-line fixes in under 10 seconds. No senior dev required."
- --text-secondary, 1.25rem, max-width 600px, centered
- Fades in 400ms after headline completes

CTA BUTTONS ROW:
Left button — PRIMARY "Get your first review free →":
  - --grad-brand background, white text, border-radius 10px, padding 14px 28px
  - Hover: scale(1.03), box-shadow: 0 0 30px rgba(88,166,255,0.4)
  - Inner shimmer: moving linear-gradient highlight on hover
  - Click: ripple effect from click origin (CSS ripple)
  - Magnetic: follows cursor within 60px proximity (max 6px displacement)

Right button — SECONDARY "See a live demo ↓":
  - Transparent, border: 1px solid --bg-subtle, text: --text-secondary
  - Hover: border-color --accent-blue, text --text-primary, bg --bg-surface
  - Arrow animates downward on hover (translateY 3px)

SOCIAL PROOF ROW (below buttons):
"Trusted by 2,400+ developers" — avatars (6 overlapping circles with gradient bg and initials) + star rating "4.9/5"
- Avatars animate in with stagger (each pops in scale 0→1 with spring, 80ms apart)

HERO VISUAL — PR REVIEW CARD (right side or below on mobile):
A floating, realistically-styled UI mockup of a DevPulse review card:
- Card background: --bg-surface, border: 1px solid --bg-subtle, border-radius 16px
- Header: PR title "feat: Add user authentication flow #247" + score badge "PR Score: 73/100" (amber color for 73)
- Three issue rows, each with:
    • Severity badge (🔴 Critical / 🟡 Warning / 🟢 Info)
    • File path in --text-code monospace
    • Short issue description
    • Expand chevron (rotates on hover)
- Skeleton loading state FIRST (gray shimmer bars), then content fades in after 1.5s delay — simulating a real review loading
- The entire card:
  - Floats with Framer Motion: subtle y-axis oscillation (y: 0 → -12 → 0, 4s loop, ease in-out)
  - Slight perspective tilt on mouse move (rotateX ±5deg, rotateY ±8deg) using mouse position
  - Drop shadow: 0 30px 80px rgba(0,0,0,0.5) + blue glow: 0 0 40px rgba(88,166,255,0.1)
  - Appears with: slideInFromRight + scale(0.95→1) on page load

SCORE COUNTER inside card:
The "73" in "PR Score: 73/100" counts up from 0 to 73 over 1.5s using requestAnimationFrame when the card first appears.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: SOCIAL PROOF TICKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full-width dark band, --bg-surface background, border top+bottom 1px --bg-subtle.
Two rows of continuously scrolling logos/text:
Row 1 (scrolls left): company names in --text-muted, monospace font — "Vercel · Stripe · Notion · Linear · Figma · Shopify · Atlassian ·" — repeating infinitely
Row 2 (scrolls right, opposite direction): developer quotes in small italic — '"Caught 3 bugs before my lead saw the PR" · "Best ₹999 I spend monthly" · "Replaced 80% of my code review time" ·'
Both rows use CSS infinite marquee animation (transform: translateX, no JS).
Hover on a row: animation pauses (animation-play-state: paused)
Section has an edge fade: mask-image linear-gradient on both sides (left/right) to fade out content naturally.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: PROBLEM → SOLUTION (Bento Grid)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section label: "WHY DEVPULSE" in --accent-blue small caps
Heading: "Senior devs are expensive. Bugs are not optional."
Subtext: "The average PR waits 18 hours for review. DevPulse responds in 10 seconds."

BENTO GRID LAYOUT (CSS Grid, 3 col × 2 row on desktop, stacks on mobile):
Each card: --bg-surface background, border: 1px solid --bg-subtle, border-radius 16px, overflow hidden
On scroll-in: cards animate with staggered y: 40px → 0, opacity 0 → 1 (each 100ms apart) using IntersectionObserver + Framer Motion

Card 1 (large, 2 cols): "10 second reviews" — animated counter + large text, gradient glow bg
Card 2 (1 col): "73% of bugs caught before merge" — circular progress ring SVG that animates to 73% on scroll-in
Card 3 (1 col): "Severity ranked" — three badge pills (Critical/Warning/Info) that each pop in with spring animation
Card 4 (1 col): "Plain English summaries" — mock paragraph text that types in character by character on scroll-in
Card 5 (1 col): "PR Health Score" — gauge/speedometer illustration in SVG that animates needle swing
Card 6 (1 col): "Line-by-line diffs" — mini code diff block with red/green lines (styled like GitHub diff view)

ALL bento cards:
- Hover: border-color transitions to --accent-blue/50, subtle inner glow (box-shadow inset)
- Hover: a very subtle gradient overlay fades in from the top (--grad-glow)
- Cursor: shows the custom cursor expansion effect on hover

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: HORIZONTAL SCROLL — FEATURE SHOWCASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section wrapper: 400vh height (sticky scroll container)
Inner: position sticky, top 0, height 100vh, overflow hidden

LEFT PANEL (fixed 40% width, stays in place):
- Section label, headline: "Everything your PR reviewer checks, automated."
- Vertical step indicator: 6 dots connected by a line
  Active dot: filled --accent-blue, pulse ring animation
  Completed dots: --accent-green checkmark
  Line between dots fills with color as scroll progresses (height animated with useTransform)
- Currently active feature name + description updates as user scrolls
  Transition: current text slides up + fades out, new text slides up + fades in

RIGHT PANEL (60% width, horizontal track scrolls left on vertical scroll):
6 feature cards laid out horizontally:

Feature 1: "PR Review on Demand"
- Visual: PR URL input bar with a "Review →" button
- Micro-interaction: input has a blinking cursor, button has the shimmer effect
- Description: "Paste any public GitHub PR URL. No install needed."

Feature 2: "GitHub App — Auto Reviews"
- Visual: GitHub webhook event visualization — a flow diagram (PR opened → webhook → DevPulse → review posted)
- Nodes connected by animated dashed lines (stroke-dashoffset animation)
- Description: "Install once. Every PR auto-reviewed the moment it opens."

Feature 3: "Severity Ranking System"
- Visual: A list of issues sorted by severity — Critical at top (red), Warning (yellow), Info (green) below
- Each row slides in from right with stagger
- Severity badge has a colored left border + pulsing dot for Critical
- Description: "Issues ranked so you fix what matters first, not last."

Feature 4: "Team Workspace"
- Visual: Avatar stack of team members + shared review timeline
- Each avatar has a colored ring (different colors per member)
- Description: "Invite your team. Shared review history for every PR."

Feature 5: "Public Review Links"
- Visual: Browser mockup showing a share URL + copy button
- Copy button: on click, icon swaps from Copy to Check (Lucide icons), reverts after 2s
- Description: "Share read-only reviews with clients or your lead. Like Notion pages."

Feature 6: "Webhook Delivery"
- Visual: Animated JSON payload block (code block) being "sent" to a Slack icon (animated arrow)
- JSON typewriter effect: code types in character by character
- Description: "POST review results to Slack, Discord, or any endpoint."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: HOW IT WORKS (Vertical Sticky Steps)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section: 500vh, sticky inner container.
Split layout: left = sticky step list, right = changing visual for each step.

10 steps from the user journey. Grouped into 4 visual phases:
Phase 1 — "Land & Sign In" (steps 1–2)
Phase 2 — "Submit PR" (steps 3–4)
Phase 3 — "AI Does the Work" (steps 5–6)
Phase 4 — "Share & Scale" (steps 7–10)

LEFT: numbered step list — each step becomes active (text brightens, left bar turns --accent-blue) as scroll reaches it. Inactive steps are --text-muted. Smooth color transition on scroll threshold.

RIGHT: corresponding visual for active step:
- Step 1: Browser showing marketing page → GitHub OAuth button
- Step 2: GitHub OAuth consent screen mockup
- Step 3: PR URL input field, user typing in animation
- Step 4: Supabase dashboard showing job row inserted (mini DB table UI)
- Step 5: Edge Function logs streaming in (terminal-style scrolling text)
- Step 6: Realtime status bar filling (0% → 100% progress) with live updates
- Step 7: Full review card renders with Framer Motion entrance
- Step 8: Share link modal with copy button
- Step 9: Razorpay checkout page mockup (blurred/stylized)
- Step 10: GitHub PR with auto-review comment posted (GitHub comment UI mockup)

Each right panel transitions: previous slides out left, new one slides in from right (x: 100% → 0%)
Right panel has a subtle background grid + glow appropriate to each step.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: LIVE REVIEW DEMO (Interactive)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section heading: "See it in action. Right now."
Subtext: "No account needed. We'll review this sample PR."

INPUT BAR (full width, prominent):
- Large input with placeholder "https://github.com/owner/repo/pull/123"
- Left icon: GitHub logo (Lucide)
- Right: "Review this PR →" button (--grad-brand)
- Input: on focus, border glows --accent-blue with box-shadow: 0 0 0 3px rgba(88,166,255,0.15)
- Typing animation: a sample URL types itself in on component mount (typewriter, JetBrains Mono)

BELOW INPUT — SIMULATED REVIEW OUTPUT:
On page load (after 2s delay, simulating a real review):
1. Progress bar at top of output area fills over 3s (0% → 100%)
2. Status badge cycles: "Fetching PR..." → "Analyzing diff..." → "Generating review..." → "Complete ✓"
   Each status: slides up with Framer Motion
3. PR Health Score: large number counts from 0 to 76, arc gauge fills green/amber/red
4. Summary paragraph types in (typewriter effect, 30ms per character)
5. Issue list: each row fades in with stagger (150ms apart) from y: 20px → 0
6. Each issue row:
   - Severity badge (colored pill)
   - File path (monospace --text-code)
   - Issue title
   - Expand button → reveals code block with suggested fix (syntax highlighted)

This entire simulated review runs on a timer loop — after 15s of idle, it resets and reruns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8: TECH STACK SHOWCASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section heading: "Built on infrastructure you already trust."
Subtext: "Every service is battle-tested and has a generous free tier."

DISPLAY: Hexagonal grid OR 4-column icon grid of tech logos (SVG icons):
GitHub, OpenAI, Supabase, Upstash, Cloudflare, Resend, Razorpay, Railway, Vercel, Next.js, Framer, Sentry

Each tech card:
- Dark card, logo centered, service name below, one-line purpose below that
- Hover: card lifts (translateY -4px), logo scales 1.1, card gets colored glow matching brand color of that service
- On scroll-in: cards animate in with stagger in a wave pattern (left to right, each 80ms)

Bottom: expandable "Why these choices?" accordion — each tech has a short rationale
(This is the resume-worthy detail that impresses technical hiring managers)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9: PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section label: "PRICING" in --accent-blue small caps
Heading: "Start free. Scale when you're ready."

BILLING TOGGLE: "Monthly / Annual" pill toggle
- Toggle animates with a sliding indicator (Framer Motion layout animation)
- Annual: prices show 20% strikethrough reduction, "Save 20%" badge appears with spring pop

THREE PLAN CARDS in a row:

Free Plan (₹0):
- Card: --bg-surface, border: 1px solid --bg-subtle
- Features: 5 reviews/mo, 1 repo, 1 member
- CTA: "Start for free"

Pro Plan (₹999/mo) — HIGHLIGHTED:
- Card: border: 1px solid --accent-blue, position: relative
- "Most Popular" badge floating top-center: --grad-brand background, small, pill shape, translateY(-50%)
- Subtle inner glow: box-shadow: 0 0 60px rgba(88,166,255,0.1) inset
- Features: 100 reviews/mo, 10 repos, 1 member, webhook delivery, public links
- CTA: "Upgrade to Pro" — --grad-brand button, full-width, shimmer on hover
- Card hover: subtle scale(1.02)

All cards animate in with stagger on scroll-in.
Feature rows: checkmark (--accent-green Lucide Check icon) for included, dash for excluded.

BELOW PRICING: "Powered by Razorpay — Secure UPI, Cards, Net Banking accepted" with Razorpay logo and UPI icon row.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10: TESTIMONIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section heading: "What developers are saying"

Layout: 3-column masonry grid of testimonial cards (different heights based on content)
8 testimonials total — placed to fill the grid naturally.

Each testimonial card:
- --bg-surface, border: 1px solid --bg-subtle, border-radius 12px, padding 20px
- Top: avatar (gradient circle with initials) + name (--text-primary bold) + role (--text-muted)
- GitHub username: @handle in --accent-blue, small, below name
- Body: quote text in --text-secondary
- Bottom: star rating (5 gold stars SVG) + DevPulse badge (tiny)
- Hover: border-color --bg-overlay brightens, subtle translateY(-2px), timing 200ms

On scroll-in: entire grid fades in with stagger wave (left col first, then center, then right), each card 80ms apart.

Marquee version on mobile: two rows, auto-scrolling horizontally (same marquee as ticker section).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11: FAQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section heading: "Everything you want to know"
Centered, max-width 720px.

8 FAQ items in Accordion (shadcn/ui Accordion component):
Q: "Does this work on private repositories?"
Q: "How accurate is the AI review?"
Q: "What languages and frameworks are supported?"
Q: "How is this different from GitHub Copilot?"
Q: "Is my code sent to OpenAI?"
Q: "Can I use this without installing the GitHub App?"
Q: "What happens when I hit my review limit?"
Q: "Do you offer refunds?"

Each accordion item:
- Trigger: question in --text-primary, chevron rotates 180deg on open (Framer Motion rotate)
- Content: answer in --text-secondary, height animates open/close with Framer Motion (height: 0 → auto)
- Open state: border-left 2px solid --accent-blue, background --bg-surface
- Only one item open at a time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 12: FINAL CTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full-width dark section, gradient mesh background (same orb animation as hero).
Centered content, large and bold.

Heading (massive): "Your next PR review is 10 seconds away."
Subtext: "Free forever on 5 reviews. No credit card. No setup. Just paste a URL."

Two buttons (same as hero CTA):
"Get your first review free →" + "View GitHub App ↗"

Below buttons: "Join 2,400+ developers shipping better code"
Avatar row + count (same as hero social proof)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOOTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--bg-surface, border-top: 1px solid --bg-subtle, padding 60px 0 32px

Top: 4-column grid
Col 1: DevPulse logo + tagline "Ship better code, faster." + social icons (GitHub, Twitter/X, Discord) — each SVG icon, hover rotates/glows
Col 2: Product links (Features, Pricing, Changelog, GitHub App, API Docs)
Col 3: Company links (About, Blog, Privacy Policy, Terms)
Col 4: Newsletter signup — input + "Subscribe" button

Bottom bar: "© 2024 DevPulse · Built with ☕ and Supabase Edge Functions" — left
Right: "Made in India 🇮🇳 · Payments by Razorpay"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCROLL PROGRESS BAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed at top of viewport, z-index highest, full width, height 2px.
Color: --grad-brand (blue to purple)
Width: mapped to window.scrollY / (document.body.scrollHeight - window.innerHeight) using Framer Motion useScroll + useTransform → scaleX 0 to 1, transform-origin left

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFORMANCE & CODE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- All Framer Motion animations: use will-change: transform, never animate width/height directly (use scaleX/scaleY instead)
- All scroll effects respect prefers-reduced-motion (wrap in useReducedMotion check)
- Images: next/image with blur placeholder
- Code blocks: use Shiki or Prism.js for syntax highlighting
- All interactive elements: keyboard accessible (focus-visible rings in --accent-blue)
- Smooth scroll: scroll-behavior: smooth globally
- Intersection observers: cleanup on unmount
- No layout shift: reserve space for async content with skeleton loaders