# ALGOS‑Δ Clinical Dashboard — Implementation Plan

Sources of truth:
- **Behaviour:** `docs/ALGOS-Delta_Project_Specification.md` (cited below as §n).
- **Visual layout:** the artboard images in `design/`, taken from `ALGOS-Delta_deck.pptx` and rendered at 1920×1080. The Claude Design source files (`.dc.html`, `support.js`) couldn't be imported because the design connector needs `/design-login`. The images are complete, so they are the visual reference.
- Resolutions of spec ambiguities: `DECISIONS.md` (cited below as D‑n).

### Design inventory (`design/`)

| File | Artboard | Notes for implementation |
|---|---|---|
| `A01-pain-episode-alert.png` | A1 Projector · pain + alert | Nav shows a **Unit** tab before Monitor (D‑28) |
| `A02-night-arousal-not-pain.png` | A2 Night · stress | "≠" between gauges; diamond derived hotspot; legend adds "Derived signal" |
| `A03-abstention-motion.png` | A3 Abstention | Fixture uses CPOT 4, not 5 (D‑2) |
| `A04-degraded-clinical-context.png` | A4 Degraded + context | "↑ Elevated" becomes "↑ Moderate" (D‑4) |
| `A05-cpot-bps-dialog.png` | A5 CPOT/BPS dialog | Dialog ~880 px, radius 28 |
| `A06-audit-trail-drawer.png` | A6 Audit drawer | Drawer is 560 px in the design, 520 px in the task brief (D‑27) |
| `A07-high-contrast.png` | A7 High contrast | Alert triangle is yellow in HC; 4 px yellow focus ring |
| `A08-components-1…4` | A8 Component sheet | Variants and tokens; drives `/dev/components` |
| `A09-calibration.png` | A9 Calibration | **Monitor layout in the CALIBRATING state**, not a separate screen (D‑29) |
| `A10-acknowledged-ward-compare.png` | A10 Ack · Ward · Compare | Acknowledged strip, Ward rule, ghost triangles, mode confirm popover |
| `A11-sign-in.png` | A11 Sign in | Amber error variant |
| `A12-unit-overview.png` | A12 Unit overview | 4 stat cards + 8 bed cards (4 × 2) |
| `A13-session-locked.png` | A13 Session locked | 4-digit PIN, blurred dashboard |

**Not designed** (follow the existing visual language): admission wizard, profile drawer, add-context command popover, log-event group, NRS quick entry, baseline confirm, command palette, demo director, Timeline tab, Assessments tab, BPS tab, settings sheet, help popover, toast, "Profile required"/"Profile incomplete" badges.

**Defects visible in the images, fixed in implementation (D‑0):** these are wraps or overlaps in the artboards. Don't copy them.
- "Estimated pain", "Arousal vs pain", "Last 10 minutes" (overlaps the y-axis "10"), "Live signals" (overlaps "PPG"), "Full scale", "Switch user".
- The trend "↑ 0.9 /min" wraps into the episode line.
- Driver titles wrap and overlap their sublines.
- "Coverage not validated for this context" spills out of its badge.
- "Last valid 5.9 · 45 s ago".
- The sign-in placeholder and unit select wrap.
- The component-sheet title wraps ("1 / 4").
- The footer disclaimer is truncated with "…".

---

## 1. Screens and routes

Router: `react-router-dom` v6. It isn't in the requested stack, but it's needed for real routes. Overlays are URL-addressable where useful, so deep links and keyboard shortcuts behave the same way.

| Route | Screen | Spec | Notes |
|---|---|---|---|
| `/signin` | Sign in | A11, §7.8 | Visual-only credentials, "Enter demo mode" |
| `/unit` | Unit overview · ICU | A12 | Bed cards sorted by priority; profile-status badges ("Profile required", "Profile incomplete") |
| `/bed/:bedId/admit` | Admission wizard (3 steps + summary) | Task §3.2‑A | Opened automatically when a bed has no profile |
| `/bed/:bedId/monitor` | Monitor (default) | A1–A4, A7, A9, A10 | All live states, including CALIBRATING (A9): hero ring, "Signal check" card, sky info strip in the alert slot, empty states (D‑29) |
| `/bed/:bedId/timeline` | Timeline tab, full screen, 30 min–24 h | §20.7 | |
| `/bed/:bedId/assessments` | Assessments tab | §20.7, D‑12 | References vs. estimates, disagreement note |
| `/dev/components` | Component sheet | A8 | Every component × state × theme |

**Overlays.** Rendered inside the bed layout. Their state lives in the UI store. Drawers also mirror to `?panel=` so deep links work.

| Overlay | Type | Trigger |
|---|---|---|
| CPOT / BPS dialog | Dialog | `C`, alert "Assess", abstention card, palette |
| NRS quick entry | Popover/Dialog | Same triggers, when the scale picker selects NRS (D‑14) |
| Audit trail | Sheet, right, 520 px, starts below the alert slot (D‑27) | `H`, nav tab |
| Patient profile | Sheet, right, 520 px, starts below the alert slot (D‑27) | Patient pill, palette |
| Add context | Command popover | "+ Add context", palette |
| Log event | Inline button group + time adjust popover | Context bar |
| Mark as baseline | Confirm popover with checklist | Context bar button |
| Mode change | Confirm popover | ICU/Ward segmented, `M` |
| Command palette | Command dialog | `Ctrl+K` |
| Demo director | Floating panel, labelled non-clinical | `Shift+D` (demo mode only) |
| Settings | Sheet | Header (WS URL, time scale, seed, calibration duration, stale thresholds) |
| Shortcut help | Popover | `?` |
| Session locked | Full-screen overlay | 5 min idle, `Ctrl+L` |

## 2. Component tree (Monitor)

```
<App>
 ├─ <Providers> (Theme, I18n, Tooltip, Toaster, Router)
 ├─ <SessionGuard> → <SessionLockOverlay/>
 ├─ <SimulatedDataWatermark/>              (demo mode only, persistent)
 ├─ <CommandPalette/> <DemoDirector/> <ShortcutLayer/>
 └─ <BedLayout bedId>                       (1920×1080 grid, no page scroll)
     ├─ <Header>
     │   ├─ <Wordmark/> <PatientPill/ (+ ProfileIncompleteBadge)>
     │   ├─ <PillNav/>                       Monitor · Timeline · Assessments · Audit trail
     │   ├─ <ModeSegmented/ + RuleText/ + ModeConfirmPopover/>
     │   ├─ <AssessmentUnavailablePill/>     (REJECTED only)
     │   ├─ <ConnectionPill/> <BaselinePill quality/>
     │   └─ <ThemeButton/> <LangButton/> <HelpButton/> <ClinicianInitials/>
     ├─ <ContextBar>
     │   ├─ <ContextChip persistent|timed/>* (tooltip: route + effect; remove → reason)
     │   ├─ <AddContextCommand/>
     │   ├─ <LogEventGroup collapsible/>
     │   ├─ <RouteLegend/> <MarkBaselineButton/ + BaselineConfirm/>
     ├─ <AlertSlot>                          fixed 60 px: Empty | Info (sky) | Alert | Advisory | Advisory+action | Acknowledged | HC
     ├─ <MainGrid 440 | 1fr | 440>
     │   ├─ Left:   <PainHeroCard/> | <AbstentionCard/> | <CalibrationHero/>   <ArousalPainGauges/>
     │   ├─ (calibrating) <SignalCheckCard/> floats on the body stage
     │   ├─ Centre: <BodyStage> (<BodySilhouette/> <SensorHotspot/>* <DriverCallout/>* <ToolRail/> <SensorLegend/>)
     │   │          <TimelineCard window=5|10|30 compare/>
     │   └─ Right:  <AttributionCard/> <TopDriversCard/> <LiveSignalsCard (canvas/SVG, refs)/>
     └─ <Footer/>                            disclaimer · model version · validated population
```

Shared primitives (Phase 1, `src/components/ui/`), following the A8 sheets:
- **Buttons:** dark primary pill, outline pill, ghost, round icon button (44 px), round yellow action. Each has default, hover, focus and disabled states. Focus is a 2 px gap plus a 3 px accent ring; HC uses a 4 px yellow ring.
- **Card:** radius 24.
- **Segmented control:** dark active pill.
- **Chips:** persistent, timed with countdown ring, dashed "+ Add".
- **Pills and badges:** Badge (amber-outline advisory badge, weight badge); StatusPill (dot + text); severity pill (filled, with bar glyph; HC uses a pattern); connection pill (Live / Simulator / Reconnecting · 6 s / Offline · last data age).
- **Overlays:** Tooltip (dark), Toast.
- **Form inputs:** Stepper, RelativeTimePicker, ScaleSegmented (RASS), PIN input.
- **Clinical helpers:** EffectLine (route icon + text), FreshnessTag, FieldMessage (amber, warning icon).

## 3. State model (Zustand)

Slices in one store, `src/store/`. Selectors are fine-grained so the 1 Hz updates don't re-render the whole tree.

```ts
session:    { user: {initials, role} | null, demoMode: boolean, locked: boolean, lastActivity }
prefs:      { theme: 'projector'|'night'|'hc', lang: 'en'|'fr', timeScale: 1|5|10,
              wsUrl, seed, calibrationSec: 90, staleRassH: 4, staleCamH: 4, cpotReminderH: 4 }
connection: { kind: 'live'|'simulator'|'reconnecting'|'offline'|'paused', lastMessageAt }
beds: Record<BedId, {
  patientProfile: PatientProfile | null,           // zod-validated
  activeContext:  ContextItem[],                   // flag, startedAt, endsAt?, removed?: {at, reason}
  events:         ClinicalEvent[],                 // event, t (event time), enteredAt
  references:     ReferenceAssessment[],           // nrs|cpot|bps, total, items?, t, enteredAt, note?
  baseline:       { state, calibratedAt, quality: 'good'|'provisional', recalibrationNeeded },
  live:           StateMessage | null,             // last inbound 1 Hz state
  history:        StateSample[],                   // ring buffer, 24 h at 1 Hz (downsampled > 30 min)
  alert:          AlertMachineState,               // see §12 rules
  lastValid:      { score, at } | null,            // stale handling
}>
audit:      AuditEntry[]                           // append-only, never deleted
ui:         { openPanel, dialog, paletteOpen, directorOpen, highlightedDriver, timelineWindow, compareModes }
```

Telemetry (25 Hz) does **not** go into React state. It goes into per-bed ring buffers (`src/data/telemetryBuffer.ts`) that the SVG/canvas renderer reads at ≤ 10 fps (§14).

Persistence: only `prefs` go to `localStorage`. Clinical data stays in memory (data minimisation, D‑15). Audit is exported as a JSON Blob.

## 4. Data contracts (`src/contracts/`)

All contracts are typed and zod-validated at the adapter boundary. Bad inbound messages are dropped and logged to the audit as `System · Malformed message`.

**Inbound** (§5, extended per D‑7):
- `StateMessage`. As in §5.1, with these changes:
  - `channels[*].state: 'OK'|'DEGRADED'|'REJECTED'|'MASKED'`;
  - `channels[*].derived?: {signal:'resp', source:'ppg'}`;
  - `channels[*].masked_by?: Flag[]`;
  - `alert.id`, `alert.ack {by, at}`;
  - `reference.last_bps`;
  - `arousal.level: 'LOW'|'MODERATE'|'HIGH'`;
  - `advisories: Advisory[]` (NMB, SCI, glucose prompt, washout).
- `TelemetryMessage {t0, fs:25, ppg[], eda[], temp[], acc[]}`.
- `EventMessage {event, t, duration_s}`.

**Outbound** (task §3.4):
- `patient_profile {…PatientProfile}`
- `context_flag {flag, active, started_at, reason?}`
- `event {event, t, entered_at}`
- `cpot_entry | bps_entry | nrs_entry {items?, total, t, entered_at, note?}`
- `mark_baseline {quality}`
- `mode_change {mode}`
- `ack_alert {alert_id}`

**PatientProfile** (zod, `src/contracts/profile.ts`):
- **Required:** `patientRef (/^P-[0-9A-F]{4}$/)`, `bedId`, `ageYears (18–110)`, `sex`, `careSetting`, `communication`, `airway`.
- **Recommended:** `admission {category, sinceSurgeryAt}`, `rass {value −5..4, at}`, `camIcu {result, at}`, `medications[] {class, startedAt?}`, `conditions[]`.
- **Optional:** `coreTemp {source, value 25–43, at}`, `skinSites[] {site, condition}`, `note (≤ 500, no identifiers)`.
- **Never stored:** names, dates of birth, doses.

**`clinicalEffects.ts`** (`src/clinical/`): the single typed config shared by the UI and the simulator. It has one entry per flag, medication class, condition, event and profile-derived flag:
```ts
{ id, kind, routes: Route[], timedMin?, reliability: Partial<Record<Channel, number>>,
  masks?: Channel[], disables?: Feature[], prior?: {pain?, stress?, agitation?},
  baselineShift?: {...}, intervalWiden?: number, advisory?: AdvisoryId,
  effectText: {en, fr}, requiresStartTime: boolean }
```
Profile fields (airway, AF, paced, CAM-ICU hyperactive, …) are mapped to effects by `deriveEffects(profile, context, events, now)`. That function is pure and unit-tested, and it feeds both the "Effect on ALGOS‑Δ" lines and the engine.

## 5. Engine and data source (`src/engine/`, `src/data/`)

- `DataSource` interface → `WebSocketSource` (live) | `SimulatorSource` (demo only).
- In live mode, connection loss shows **"Connection lost — data paused"**. It never falls back to the simulator (D‑9).
- Pure engine modules, each unit-tested:
  - `reliability.ts`: r_c = SQI × Π m.
  - `channelState.ts`: OK/DEGRADED/REJECTED/MASKED.
  - `status.ts`: OK/DEGRADED/REJECTED plus abstain reasons.
  - `prior.ts`: Saerens shift.
  - `alertMachine.ts`: ICU/Ward rules, persistence, hysteresis, re-escalation, Ward rate limit, no alert while REJECTED.
  - `episode.ts`: ≥ 4 for 5 s / < 2 for 10 s.
  - `stale.ts`: age, dim, hide after 300 s; freshness for RASS/CAM/CPOT.
  - `rules.ts`: every task §3.3 rule.
  - `validation.ts`: contradiction checks.
- The simulator runs on mulberry32 seed 42, with τ = 5 s smoothing and the scenarios from §15.1. It consumes outbound messages and applies `clinicalEffects.ts` through the same engine, so every input visibly changes rings, masks, interval, weights, attribution and advisories.

## 6. Directory layout

```
src/
  app/            routes, providers, layouts
  components/ui/  primitives (shadcn + custom)
  features/       header, context-bar, alert-slot, hero, gauges, body-map, timeline,
                  attribution, drivers, telemetry, cpot-bps, nrs, audit, profile,
                  admission, add-context, events, baseline, mode, palette, director,
                  lock, signin, unit, calibration, assessments
  clinical/       clinicalEffects.ts, scales.ts (CPOT/BPS/RASS/CAM descriptors)
  contracts/      zod schemas + types
  engine/         pure logic (tested)
  data/           websocket, simulator, telemetry buffer
  store/          zustand slices
  i18n/           en.ts, fr.ts (typed: fr must satisfy keyof en)
  styles/         tokens.css (3 themes), globals.css
  test/           vitest setup
```

## 7. Phase plan and checkpoints

Each phase ends with these checks: `tsc --noEmit` passes, lint passes, tests pass, no console errors. Then I take screenshots at 1920×1080 and 1366×768, compare them with the designs, and commit.

| Phase | Scope | Checkpoint / exit criteria |
|---|---|---|
| **0** | PLAN.md, DECISIONS.md, `git init` | Owner reviews both docs ← **we are here** |
| **1 Design system** | Vite + React 18 + TS strict, Tailwind, shadcn/ui, tokens for 3 themes + attribution palette, Plus Jakarta Sans with `tabular-nums`, i18n skeleton, primitives, `/dev/components` | Every primitive in every state in all 3 themes; HC uses AAA contrast and patterns; screenshots vs. the Components design |
| **2 Monitor** | Header → footer, all monitor cards, body map, timeline, telemetry; states A1 pain+alert, A2 night stress, A3 abstention, A4 degraded+context, A5 CPOT/BPS (+ BPS tab), A6 audit, A7 HC; layout fixes from §19.1 | Each state reachable from a fixture; side-by-side screenshots match the designs; no wraps, overlaps or clipped footer at 1920×1080; graceful at 1366×768 |
| **3 Clinical data entry** | `clinicalEffects.ts`, zod schemas, admission wizard, profile drawer (undo toast, freshness, sticky effects), add-context command, log-event group with retro time, NRS quick entry + scale selection, baseline confirm with quality, mode confirm, command palette, every §3.3 rule | Unit tests for every §3.3 rule and schema; keyboard-only walkthrough of each form; axe check without violations; every input visibly changes the monitor in the simulator |
| **4 Data/logic** | WS adapter, simulator, alert machine, stale handling, audit (append-only, export), demo director, session lock, full EN/FR, theme cycling, shortcuts §11.3, live-mode safeguard | Tests for alert rules, abstention and stale timers; "Run full demo" plays end to end; killing the WS in live mode shows "data paused", not simulated data |
| **5 Remaining screens** | Sign in (A11), Unit overview (A12, plus profile badges), Calibration state (A9), Acknowledged/Ward/compare (A10), lock overlay (A13): all designed, so they're compared with the designs. Timeline tab and Assessments tab are undesigned and follow the visual language. | Screenshot comparison for A9–A13; README complete (install, run, demo, shortcuts, libraries + licences) |

**Risks**
- I only have flattened images, not the `.dc.html` source. Exact spacing and type sizes are measured from 1920×1080 renders, so expect ±2 px.
- Recharts can't easily draw the hatched abstention region or the alert triangles. I'll use custom `<Customized>` SVG layers.
- At 1366×768 the three-column grid has to compress. Plan: the side columns shrink to 360 px, the body stage loses callout labels (hotspots stay), and the hero numeral scales from 144 px to 112 px. Nothing is hidden that carries safety meaning (alert slot, status, disclaimer).

---

## Phase status

### Phase 1 — Design system ✅

| Area | Where |
|---|---|
| Tokens, 3 themes, attribution palette, HC patterns | `src/styles/tokens.css`, `src/styles/globals.css`, `tailwind.config.ts` (`hc:` / `night:` variants) |
| Primitives | `src/components/ui/`: Button, Card, Segmented, ContextChip / AddChip, CountdownRing, Badge, StatusPill, Tooltip, Toast, AlertSlot, Dialog / Sheet / Popover, form controls, Wordmark, Footer, RouteIcon / RouteLegend |
| Clinical display components (presentational, props only) | `src/components/clinical/`: PainHeroCard, ScaleBar, SeverityPill / Tag, ArcGauge / ArousalPainCard, AttributionBar, SensorHotspot / Legend, DriverRow, TelemetryRow, timeline markers, ModeControl / ModeConfirmBody, ConnectionPill, BaselinePill |
| i18n | `src/i18n/` (typed EN/FR, decimal comma, `LangScope`) |
| Prefs store | `src/store/prefs.ts` (theme, language; only these are persisted) |
| Showcase | `/dev/components?sheet=1…4\|extras` |
| Tests | `npm test`: i18n parity, formatters, severity / arousal thresholds, red-usage guard (D-6), Segmented keyboard, ScaleBar / Attribution / Hero / AlertSlot rules, prefs, `cn` merge config |
| Screenshots | `npm run screenshots` → `screenshots/` (1920 + 1366 × 3 themes); `node scripts/overlay-check.mjs` |

Visual comparison against A8 sheets 1–4 and A1/A2/A5/A7 led to these fixes:
- gauge arc geometry: start angle, ~200° sweep, thin outer interval arc;
- `tailwind-merge` dropping the focus outline and HC border widths (D-16);
- driver row layout (D-38);
- zero shares omitted from the attribution legend;
- telemetry trace width;
- sheet grids stack below 1500 px instead of scrolling sideways.

Components that only exist inside larger screens are built in Phase 2 on top of these primitives: the header, context bar, body map and timeline chart.
