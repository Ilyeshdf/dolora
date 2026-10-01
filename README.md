# ALGOS‑Δ clinical dashboard

Research prototype for the ICAIMB 2026 "PAIN SCORE" hackathon. **Not a medical device.** Decision support only; validated on healthy adults with experimental pain.

- Behaviour: `docs/ALGOS-Delta_Project_Specification.md`
- Visual reference: `design/` (artboards A1–A13 at 1920×1080)
- Plan and decisions: `PLAN.md`, `DECISIONS.md`

## Run

```bash
npm install
npm run dev          # http://localhost:5173 → /dev/components
```

## Checks

```bash
npm run typecheck    # TypeScript strict
npm run lint         # ESLint, zero warnings allowed
npm test             # Vitest + Testing Library
npm run screenshots  # needs `npm run dev` running; uses local Edge/Chrome
```

Status: Phase 1 (design system) complete. Install, demo-mode and shortcut documentation and the list of libraries with their licences will be completed in Phase 5.
