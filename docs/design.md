# DevPulse — Design Notes

A high-fidelity marketing landing page + clickable review prototype for **DevPulse**, an AI code-review SaaS. Entry point: `DevPulse.html`.

---

## 1. Brand & aesthetic

**Direction:** developer-brutalist — the same family as Linear, Vercel, Railway. Tight letter-spacing, hairline borders, mono-coded metadata, generous whitespace, one bold accent color doing all the work. No gradient soup, no AI tropes.

**Voice:** terse and confident. Copy reads like a senior dev wrote it.

**Type pairing**
| Role | Family | Notes |
|---|---|---|
| Display + body | `Space Grotesk` | 400 / 500 / 600. Used for headlines (500, -0.035em tracking) and UI text. |
| Code + metadata | `JetBrains Mono` | 400 / 500. Used for file paths, kbd, score numerals, eyebrows, pills. |

Type ramp (rendered via `clamp()` so it scales with viewport):
- `h1` — 40 → 76 px, line-height 1.02, letter-spacing -0.035em
- `h2` — 28 → 44 px, line-height 1.08, letter-spacing -0.028em
- Lead — 18 px, color `--text-muted`, max 56ch
- Body — 14–16 px
- Mono caption / eyebrow — 11 px, uppercase, 0.08em tracking

---

## 2. Color system

Two themes, four selectable accents. Both themes share severity colors tuned for contrast on their backgrounds.

### Base tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAFAF9` | `#0A0A0B` | Page background |
| `--bg-elev` | `#FFFFFF` | `#111114` | Cards, nav, elevated surfaces |
| `--bg-soft` | `#F4F4F2` | `#16161A` | Alternating section backgrounds |
| `--bg-code` | `#F7F7F5` | `#0F0F12` | Code blocks |
| `--border` | `#E6E6E1` | `#1F1F25` | Card borders |
| `--border-faint` | `#EFEFEC` | `#18181D` | List dividers |
| `--text` | `#0A0A0B` | `#ECECEE` | Primary text |
| `--text-muted` | `#5C5C62` | `#9C9CA4` | Secondary text |
| `--text-faint` | `#8A8A8E` | `#5C5C66` | Captions, line numbers |

### Accent — the "pulse"

Two tokens, picked apart deliberately so content stays legible on every surface:

- **`--accent-ink`** — content on **solid `--accent`** backgrounds. Always dark in both themes (because the accent itself is always bright). Used on: primary buttons, the logo mark, text selection.
- **`--accent-on-soft`** — content on **`--accent-soft`** (tinted) backgrounds. Dark in light theme, bright accent in dark theme. Used on: the "survives review" highlight, feature icons, accent pills, the streaming "done" chip.

Four selectable accents (Tweaks panel):

| Key | Light | Dark | Personality |
|---|---|---|---|
| `lime` (default) | `#84CC16` | `#BEF264` | Energy, the "pulse" |
| `coral` | `#F97066` | `#FCA5A0` | Warm, friendly |
| `electric` | `#2563EB` | `#60A5FA` | Classic dev-tool |
| `violet` | `#7C3AED` | `#C4B5FD` | Distinctive, premium |

### Severity scale (used by issue badges, dots, sparklines)

| Level | Light | Dark | Used for |
|---|---|---|---|
| `crit` | `#DC2626` | `#FB7185` | Block-worthy bugs (SQL injection) |
| `high` | `#EA580C` | `#FB923C` | Should fix before merge |
| `med` | `#CA8A04` | `#FBBF24` | Worth a comment |
| `low` | `#2563EB` | `#60A5FA` | Style / nit |
| `ok` | `#059669` | `#34D399` | Pass / passed |

---

## 3. Spacing, radii, shadows

- **Section padding** — `96px 0` for major sections, `56px 0` for small
- **Container** — `max-width: 1240px`, `padding: 0 32px`
- **Radii** — 4 / 6 / 10 / 14 / 20 px (`--radius-xs … --radius-xl`). Cards use 14, buttons 6, pills 999.
- **Shadows** — three steps. `sm` for resting cards, `md` for hover/popovers, `lg` for the hero preview + CTA panel.
- **Borders** — hairline (1px), `--border` for definition and `--border-faint` for dividers inside a card.

---

## 4. Page architecture

```
DevPulse.html
├── tokens.css     ← design tokens (themes + accents)
├── styles.css     ← base, layout, components
├── data.jsx       ← demo PR, bug examples, features, pricing, stack
├── components.jsx ← shared visual primitives
├── tweaks-panel.jsx ← Tweaks shell + controls (starter component)
├── landing.jsx    ← marketing page sections
├── review-screen.jsx ← clickable review detail prototype
└── app.jsx        ← root: route + tweaks
```

Each `.jsx` runs in its own Babel script scope; cross-file sharing goes through `window.*`.

### Marketing landing (route: `landing`)

1. **Nav** — sticky, backdrop-blurred, theme toggle + sign-in + primary CTA
2. **Hero** — headline with inline highlight, live PR URL input, trust strip, floating review-card preview rotated -1° with a `6.4s` badge
3. **Live streaming demo** — terminal-style card; logs and issues stream in over ~5s with `dp-fade-up` entry; score animates as issues land; "Replay" restarts. The wow moment.
4. **What it catches** — selectable list of 4 *real* bugs (SQL injection, race condition, unhandled promise, N+1). Each shows the bad code, AI explanation, and a suggested fix when applicable.
5. **Health score showcase** — picker for the 4 visualizations
6. **Features grid** — 6 feature cards + an "under the hood" stack strip
7. **Pricing** — Free / Pro ₹499 / Team ₹1,499, INR-first
8. **CTA section** — full-width card with a pulse-waveform bg motif
9. **Footer** — 4 columns + status indicator

### Review detail (route: `review`)

Reached via the nav CTA or any pricing button. A full product surface:

- Header — repo/PR meta, title, author, branch arrow, **live Health Score** card
- Tabs — Issues · Files · Summary · Share & deliver
- **Issues tab** — left rail (severity badge + title + file:line + confidence %), right detail (code block + AI explanation + suggested fix + Accept/Refine/👍 actions). Issues stream in on load.
- **Files tab** — file list with +/− and issue counts
- **Summary tab** — plain-English review prose + bars/histogram score cards
- **Share tab** — public read-only link with copy button + delivery channels (Slack, webhook, GitHub check, email)

---

## 5. Components

### Visual primitives (`components.jsx`)
- `PulseLogo` / `Wordmark` — heartbeat-waveform mark on a solid accent square
- `Nav` — top nav with theme toggle and primary CTA
- `CodeBlock` — file header + line-numbered diff body with `is-bad` / `is-good` line highlighting. Inline tokens via a tiny token renderer (`{key:"const"}`, `{str:"…"}`, `{fn:"name"}`, `{com:"// …"}`).
- `HealthScore` — single component that switches between 4 variants:
  - **Radial** — circular progress, big numeral inside
  - **Numeric** — oversized number + sparkbar
  - **Bars** — 5-dimension breakdown (Security / Bugs / Perf / Style / Tests)
  - **Histogram** — issue counts by severity, color-coded
- `Footer` — 4-column with status pill

### Section components (`landing.jsx`)
`HeroSection` · `LiveDemoSection` · `CatchesSection` · `ScoreShowcase` · `FeaturesSection` · `PricingSection` · `CtaSection`

### Severity language
- **Badges** (`.dp-sev`) — mono, uppercase, color-coded background
- **Dots** (`.dp-dot`) — 8px filled circle with a soft halo (`box-shadow: 0 0 0 4px <color-soft>`)
- **Pills** (`.dp-pill`) — rounded mono labels for metadata (file paths, status, counts)

---

## 6. Motion

Restrained. Three named keyframes:
- `dp-fade-up` (350ms) — streaming issues, list items entering
- `dp-cursor-blink` — terminal cursor in the streaming pane and the "Reviewing…" button state
- `dp-pulse` — reserved for the logo (currently unused; available for live indicators)

Plus:
- Buttons: `translateY(-1px)` on hover
- Score values: `width` / `stroke-dasharray` / `height` transitions on a 1s ease curve so numbers settle visibly when streaming completes

---

## 7. Tweaks panel

Bottom-right, opened from the toolbar toggle. Controls:

| Section | Control | Effect |
|---|---|---|
| Theme | Dark mode toggle | Flips `[data-theme]` on `<html>` |
| Theme | Accent color | 4 curated palettes; flips `[data-accent]` |
| Health Score | Visualization | Cycles between radial / numeric / bars / histogram everywhere it's used |
| View | Screen | Jump between landing and review prototype |

State persists via the `__edit_mode_set_keys` protocol — defaults live in `TWEAK_DEFAULTS` and survive reload.

---

## 8. Demo data

A single fictional PR — `acme/api-server#1284 feat(search): add user search endpoint with caching` — drives the entire demo. The four bug examples are written as realistic TypeScript with the actual vulnerable lines:

1. **SQL injection** — `\`SELECT * FROM users WHERE email LIKE '%${q}%'\`` → parameterized fix shown
2. **Race condition** — uncached cache fill without single-flight → thundering-herd explanation
3. **N+1 query** — `await db.getPosts(user.id)` inside `for…of` → 1+N round trips
4. **Unhandled promise** — `fetch()` without `await` → Slack call lost, log lies

Each has a confidence score, the bad lines visually marked red, and (where applicable) a green "proposed fix" diff.

---

## 9. Accessibility notes

- Color is never the only signal — severity badges always carry a text label (`CRIT`, `HIGH`, `MED`, `LOW`).
- `--accent-ink` and `--accent-on-soft` are tuned so text on accent surfaces clears WCAG AA in both themes.
- Focus states inherit from the base button styles; primary CTA stays visible against any accent.
- Tabs use real `<button>` elements; the score picker too.

---

## 10. Possible next moves

- Promote one health-score visualization once chosen and remove the picker
- Add an onboarding step (paste-your-first-PR) between landing and review
- Real GitHub OAuth screen mock
- Razorpay upgrade modal triggered by hitting free limits
- Mobile breakpoints below 720px (currently nav collapses; sections need stacking)
