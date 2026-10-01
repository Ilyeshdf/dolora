# ALGOS‑Δ — Design and Behaviour Decisions

How each item in spec §19 is resolved, plus other conflicts found while planning. Entries marked **(owner)** use the resolutions given in the task brief. The others are my proposals. Flag any you want changed.

---

## §19.1 Layout defects

**D‑0 Layout fixes.**
- Single-line labels get `white-space: nowrap`. This covers the wordmark, "Audit trail", "Baseline: adaptive", "Possible unmanaged pain", "(1 min 12 s)", "Assess CPOT / BPS", "80% interval 4.3 – 8.1", "Compare modes", "vs this patient's baseline", "Save assessment", "Total 4 / 8", "Last valid 5.9 · 45 s ago" and the timeline legends.
- Where space is tight, the container gives way (flex-shrink, truncation with a tooltip on secondary text only). The label itself never wraps.
- Driver sublines get `line-clamp: 1` with a full-text tooltip.
- The sensor legend becomes a flex column: the title takes its own row, with a gap before the items. This removes the overlap of "Sensor reliability" and "OK".
- The "No drivers to show" empty state becomes a stacked flex layout with a fixed gap, never absolutely positioned text.
- Footer: the page is a CSS grid with rows `auto auto <alert-slot fixed> 1fr auto` at `height: 100dvh`. The footer is its own row, so it can't be clipped. A Playwright/Vitest layout check confirms it's in view at 1920×1080 and 1366×768.
- I18n: FR strings are about 20–30% longer, so every nowrap label is also checked in FR.

## §19.2 Content and logic

**D‑1 "Coverage not validated" badge (owner).**
- Shown on the pain hero for **every patient whose profile is a real clinical patient** (care setting ICU or Post-op ward).
- Hidden only in demo sessions flagged as healthy-volunteer (`profile.population = 'healthy_volunteer'`, which only demo mode can set).
- This also applies to A1, which doesn't show it in the design.
- Styling follows A4/A8: an amber-outline advisory badge with an info icon. It's a caution about validation scope, not an alarm. Its label must fit on one line ("Coverage not validated for this context" spills out of the badge in A4).
- `pain.interval.coverage_validated` from the engine can add the badge in other cases, but it can't remove it for clinical patients.

**D‑2 CPOT 4 vs 5 (A5 vs A3).** A5 is authoritative: CPOT 4 at 14:33:40. The A3 fixture uses "CPOT 4 · 14:33:40". The dialog's header time and the timeline marker come from the same `reference.t`, so they can't diverge.

**D‑3 Baseline timing.**
- Fixture order: "CPOT recorded 13:58:10 (total 0 / 8)", then "Baseline marked 13:58:30 (quality: good)".
- In the app, marking a baseline requires a recent assessment that qualifies (see D‑13), so the order is enforced by the UI.

**D‑4 Arousal levels (owner).**
- Only LOW / MODERATE / HIGH. "Elevated" is removed (A4 shows "↑ Moderate").
- Thresholds on `index_z`: LOW < 1.0, MODERATE 1.0–2.0, HIGH ≥ 2.0. These are configurable expert priors.
- FR: Faible / Modérée / Élevée.

**D‑5 Drivers vs attribution (owner).**
- **Top drivers** explain the **pain score** (Head A SHAP contributions). Title: "What moves the pain score", subtitle "vs this patient's baseline".
- **Attribution card** explains **why the arousal is attributed** to pain / stress / agitation / rest / unexplained (Head B). Title: "Why is the body aroused?" (FR: « Pourquoi cette activation ? »).
- Each card has an info tooltip with one sentence stating which question it answers.
- In the stress state (A2), drivers show small contributions plus a muted note: "Arousal is high but contributes little to the pain score".

**D‑6 Red (owner).**
- Saturated red (`--alert`) = alert semantics only: the alert banner, timeline alert triangles, and the alert badge on Unit overview bed cards.
- Never decoration, never form errors, never stale values, never sensor states.
- Form validation is amber (`--advisory-*`).
- The pain-severe colour (#B5475A, muted rose) is kept distinct from `--alert` and only labels the severity band.
- A lint rule (a grep in CI) fails if `--alert` is used outside an allow-listed set of components.

**D‑7 Channel states (owner).**
- The schema gets `MASKED` (by clinical context; `masked_by: Flag[]`) and a `DERIVED` signal marker (`derived: {signal, source}`, e.g. breathing derived from PPG).
- Visual encoding:

  | State | Look |
  |---|---|
  | OK | Filled teal |
  | DEGRADED | Amber ring |
  | REJECTED | Grey, crossed out |
  | MASKED | Dashed outline + slash-lock icon |
  | DERIVED | Diamond |

- The legend always lists all five.

**D‑8 "Assessment unavailable" header pill.** Formally part of the header spec. It's a slate StatusPill, shown when `status = REJECTED` (including CONTEXT_UNASSESSABLE), placed between the mode control and the connection pill. It's not red.

**D‑9 Abstention card shows the latest manual assessment.** Below the reasons it shows "Last CPOT 4 · 3 min ago" (or BPS/NRS), with the same freshness rules. This fixes 19.2‑9 and also covers §20.1. The hero in normal states shows the same line.

**D‑10 Calibration duration (owner).** 90 s by default, configurable in Settings (60–180 s). In demo mode the time scale compresses it.

## Other conflicts and gaps

**D‑11 Simulator fallback vs live-mode safeguard.**
- §13 #10 says "reconnect ×3 then simulator fallback". The task overrides this.
- In **live** mode: reconnect with backoff (Reconnecting pill, pulsing amber). After that it shows **"Connection lost — data paused"**: the last values are dimmed with their age and hidden after 300 s. It **never** switches to simulated data.
- The simulator runs **only** in explicit demo mode, which shows a persistent "SIMULATED DATA" watermark and the "Simulator" connection pill.

**D‑12 Assessments tab: disagreement rule.**
- The task brief says "differ by ≥ 3 points". Comparing different scales requires normalising each reference to 0–10:
  - NRS: as is;
  - CPOT: total × 10/8;
  - BPS: (total − 3) × 10/9.
- The estimate is the ALGOS‑Δ point score at the reference time.
- When |Δ| ≥ 3, the row shows a neutral note: "Estimate and clinical assessment disagree — clinician assessment prevails". The disagreement is audited.
- The normalisation is shown in a tooltip so the comparison is transparent.

**D‑13 Baseline quality.**
- **Good** requires all three checklist items: patient calm; last CPOT/BPS ≤ 2 or NRS ≤ 3, taken within 30 min; signals OK.
- If any item fails or the assessment is missing/old, the popover offers "Assess now" (primary) or "Mark as provisional baseline".
- The quality shows in the header baseline pill. "Provisional" is amber text on neutral, not red.
- Note: "CPOT ≤ 2" is a deliberate relaxation of §3.5's "CPOT = 0", per the task brief. It covers §13 #13 (patient already in pain at calibration).

**D‑14 Which reference scale is offered first.**

| Communication | Airway | Offered first |
|---|---|---|
| Can self-report | any | NRS |
| Intermittent / cannot self-report | intubated | BPS (CPOT with the ventilator-compliance item as the second tab) |
| Cannot self-report | not intubated | CPOT (vocalization item) |
| Intermittent | not intubated | NRS, with "switch to CPOT" one tap away |

The user can always switch scales.

**D‑15 Storage.**
- §14's "no localStorage" constraint applied to claude.ai artifacts. This is a local Vite app.
- Even so, only display preferences (theme, language, time scale, WS URL) are persisted.
- Profiles, context, references and audit stay in memory (data minimisation). The audit is exported as JSON on demand.

**D‑16 Tailwind and icons.** §14's "no arbitrary values / lucide 0.383" limits also came from artifacts. Here the app uses current lucide-react and Tailwind theme extensions mapped to CSS variables. Arbitrary values are avoided anyway, so styling stays token-driven.

**D‑17 Alerts while locked or with a dialog open.**
- Monitoring continues while the session is locked.
- A new alert shows on the lock overlay as a minimal strip ("Bed 4 · Possible unmanaged pain · Unlock to view"), with no clinical detail beyond that.
- An alert during the CPOT dialog goes into the alert slot, which stays visible above the scrim (the dialog is placed below it). Focus isn't stolen.
- Multiple alerts on one bed collapse into the highest-priority one. On Unit overview each bed shows its own badge.

**D‑18 Acknowledge then REJECTED.** Acknowledgement stays on the record. The acknowledged strip is replaced by the abstention advisory (ICU). The re-escalation timer pauses while REJECTED and resumes from zero once the status recovers.

**D‑19 Retroactive entries.** Events and timed context take both `t` (when it happened) and `entered_at`. Timeline markers sit at `t`. Timed chips count down from `t + duration`, so an item that has already expired is logged but never shown as a chip. The audit records both times.

**D‑20 Agitation vs Activity.** One attribution class: "Agitation" in ICU mode, "Activity" in Ward mode (§18.4). If motion is masked (NMB), the segment shows "n/a".

**D‑21 BPS tab.** Built following the CPOT dialog pattern: 3 items × 1–4 (facial expression, upper limbs, compliance with ventilation, or vocalization if not intubated), total 3–12, "Pain likely (> 5)". If NMB is active, both tabs show the note "Behavioural items cannot be scored validly under neuromuscular blockade".

**D‑22 Tool rail behaviour.**
- Sensor labels: toggles hotspot labels.
- Drivers: toggles callouts and leader lines.
- Front/back: switches the silhouette view. Only the front carries sensors in this prototype; the back shows "No sensors on this view".
- Zoom: three steps centred on the highlighted sensor.

**D‑23 Mobile/tablet.** Out of scope for this task (laptop + projector, per the interview). The layout stops at 1366×768. Below that, a notice says "Use a larger screen".

**D‑24 Timezone and midnight.** Times are shown in the device's local time, 24 h, `HH:mm:ss`. The timeline adds a date label when its window crosses midnight.

**D‑25 Insulin-treated diabetes prompt.** "Consider checking glucose" is phrased as an assessment. It appears only when there is unexplained arousal (attribution.unexplained ≥ 0.25 or the unexplained-arousal flag) **and** an EDA rise. Never a treatment.

**D‑26 Mode change source of truth.** Changing the care setting in the profile sets the *default* mode and requires the same confirmation as the ICU/Ward control. Both write one `mode_change` audit entry stating old → new rule.

## Decisions from the design images (`design/`)

**D‑27 Drawer geometry.**
- A6 shows a 560 px drawer that covers the alert-slot buttons. The task brief requires 520 px and says the drawer must never cover the alert slot or the hero.
- Resolution: both drawers (audit trail, patient profile) are 520 px wide and **start below the alert slot**. They are anchored at the top of the main grid and run to the footer.
- The scrim covers only the centre and right columns. The header, context bar, alert slot, hero and footer stay visible and interactive, so Acknowledge and Assess are always reachable.

**D‑28 Nav tabs.**
- A1 and A12 show a **Unit** tab; A2–A10 don't. Resolution: Unit · Monitor · Timeline · Assessments · Audit trail on every bed screen.
- On Unit overview, the bed-specific header items are hidden: no patient pill, and no mode/baseline controls (A12 shows them, but they'd be ambiguous with 8 beds). The header there keeps unit-level items only: connection, theme, language, help and user.

**D‑29 Calibration is a Monitor state, not a route.**
- A9 is the Monitor layout with `baseline.state = CALIBRATING`. The hero is a progress ring ("0:54 / 1:30"); the alert slot shows the sky "info" variant with time remaining; a "Signal check" card sits on the body stage; the other cards show "Available after calibration".
- The `/calibration` route is dropped. Monitor goes to normal display automatically when calibration completes.
- A9's header shows Ward selected while the patient pill says ICU. That's a mock-up inconsistency: the mode follows the care setting (ICU) unless the clinician changes it.

**D‑30 Colours not in the spec's token table.** Taken from A8 sheet 4:
- Night active pill #E6EDF3.
- Arousal line #6FA8E8.
- HC text secondary #E6E6E6 and muted #CCCCCC.
- HC uncertainty band #9E9E9E (neutral grey, not yellow).
- HC patterns: pain mild = dots, moderate = stripes, severe = solid. Attribution: pain = solid, stress = stripes, agitation = dots, rest = cross-hatch, unexplained = sparse hatch.
- In HC, alert triangles and the alert banner are yellow (#FFE14D) with black text. HC has no red at all.

**D‑31 Hotspot shapes.** Shape carries the state and colour only reinforces it (A8 sheet 2):

| State | Shape |
|---|---|
| OK | Filled ring |
| Degraded | Half ring |
| Rejected | Crossed point |
| Masked | Dashed outline + slash-lock |
| Derived | Diamond |
| Highlighted | Hover halo |

**D‑32 Live-signals yellow action button.** The design doesn't say what it does. It opens the Timeline tab with the signal lanes expanded (the same history, full screen).

**D‑33 Sign-in error.** Amber outline plus a warning icon, with the text "Staff ID or password not recognised", as in A11. In this prototype the credentials are never checked. The error variant can be seen only in `/dev/components`, so a real sign-in always succeeds as a visual-only flow.
