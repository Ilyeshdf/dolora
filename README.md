# ALGOS‑Δ clinical dashboard

Research prototype for the ICAIMB 2026 "PAIN SCORE" hackathon. **Not a medical device.** Decision support only; validated on healthy adults with experimental pain.

- Behaviour: `docs/ALGOS-Delta_Project_Specification.md`
- Visual reference: `design/` (artboards A1–A13 at 1920×1080)
- Plan and decisions: `PLAN.md`, `DECISIONS.md`

## Run

```bash
npm install
npm run dev          # http://localhost:5173 → /bed/4/monitor
```

## Checks

```bash
npm run typecheck    # TypeScript strict
npm run lint         # ESLint, zero warnings allowed
npm test             # Vitest + Testing Library
npm run screenshots  # needs `npm run dev` running; uses local Edge/Chrome
```

## Screens (Phase 2)

| URL | Artboard |
|---|---|
| `/bed/4/monitor?state=pain&hover=eda_scr_rate` | A1 pain episode + alert (A7 = same in High contrast, `T` theme button) |
| `/bed/4/monitor?state=stress` | A2 arousal ≠ pain (designed in Night) |
| `/bed/4/monitor?state=abstain` | A3 abstention / motion artifact |
| `/bed/4/monitor?state=degraded` | A4 degraded + clinical context |
| `/bed/4/monitor?state=pain&dialog=assessment&prefill=a5` | A5 CPOT/BPS dialog |
| `/bed/4/monitor?state=pain&panel=audit` | A6 audit trail drawer |
| `/dev/components` | A8 component sheets |

Data shown is **demo fixture data**, not clinical data. Live and simulated streams arrive in Phase 4.

Status: Phases 1–2 complete. Install, demo-mode and shortcut documentation and the list of libraries with their licences will be completed in Phase 5.
