# ALGOS‑Δ — Complete Project Specification

> **Purpose of this document.** A single, self-contained reference for the ALGOS‑Δ project (ICAIMB 2026 Hackathon "PAIN SCORE"). It is written so that another developer, designer or AI can understand the project almost completely without the original conversation.
>
> **Snapshot date:** 30 September 2026 (evening before the hackathon, which runs 1–3 October 2026 at Université de Batna 2, Algeria).

---

## 0. How to read this document

Every feature, rule or element carries one of these status tags:

| Tag | Meaning |
|---|---|
| **[BRIEF]** | Required or stated by the official hackathon *cahier des charges* (the PDF). Non-negotiable context. |
| **[EXISTING]** | Already designed and visible in the 7 completed Claude Design artboards (screenshots), or explicitly decided by the project owner during the design interview. |
| **[PLANNED]** | Agreed and specified during the project conversation, but not yet built (prompts written, artboards or code not yet produced). |
| **[SUGGESTED]** | Proposed in this document's analysis. Not agreed by the owner. Treat as optional. |
| **[OPEN]** | Unclear, contradictory or undecided. Needs an owner decision. |

Numbers marked *demo value* are fictional values used in mockups and the simulator. They are not clinical data.

---

## 1. Project context

### 1.1 The hackathon [BRIEF]
- **Event:** ICAIMB 2026 (International Conference on Artificial Intelligence, Medicine & Biomedical Engineering), Hackathon "PAIN SCORE — Can We Measure Pain?"
- **Host:** Université de Batna 2 — Mustapha Ben Boulaïd, Batna, Algeria, 1–3 October 2026.
- **Challenge question:** *Can we estimate a patient's pain intensity using measurable physiological, behavioural and/or digital signals?*
- **What the jury wants:** "A scientifically justified prototype capable of demonstrating whether measurable signals can contribute to pain estimation."
- **What the jury explicitly does NOT want:**
  - a perfect pain detector;
  - an automatic medical diagnosis;
  - a replacement for the doctor;
  - a system that must use a single sensor;
  - a claim that pain can be "read" directly by a machine.

### 1.2 Scientific premises stated by the brief [BRIEF]
- Pain is defined by the IASP as a sensory and emotional experience. Pain ≠ nociception.
- There is no single "pain sensor". Physiological signals (HR, HRV, EDA, temperature, respiration, movement, EMG, face, voice) are *correlates*, never specific biomarkers.
- **The "hard part" (section 22):** a physiological change does not automatically mean pain. Anxiety, fear, physical effort, stress, caffeine and fever produce similar changes. Distinguishing them is the core scientific challenge.
- **Baseline:** the same HR (e.g. 90 bpm) means different things for different people. Teams should reason in relative changes (ΔHR, ΔGSR, …).
- **Ground truth:** self-reported NRS 0–10. The patient's self-report is never "wrong"; the system aims to *contribute* where self-report is impossible (ICU, sedation, infants, cognitive impairment).
- **False negatives** lead to under-treated pain, especially in vulnerable populations. **False positives** lead to unnecessary interventions and loss of trust. Teams must reason about this trade-off.
- **Personalisation:** baseline normalisation, adaptive models or short calibration are suggested.
- **Temporal analysis:** level, trend, rising/falling phases, distinct episodes.

### 1.3 Judging grid [BRIEF]

| Criterion | Weight | What is evaluated |
|---|---|---|
| Technical performance | 30% | Rigour of data processing, implementation quality, justified methodological choices, measured results |
| Medical relevance | 25% | Understanding of the clinical problem, coherence with the brief's principles, **realism of claims** |
| Innovation | 20% | Originality of approach; creative combination of signals, methods, uses |
| Prototype & demo | 15% | Working prototype, live demo quality |
| Presentation | 10% | Clarity, argument structure, answers to jury questions |

- **Suggested metrics** [BRIEF]: MAE, RMSE, correlation (continuous output); accuracy, precision, recall, F1 (classification).
- **Bonus items** [BRIEF]: real-time estimation, personalised baseline, multimodal detection, explainable AI, low cost, wearable, mobile app, privacy-respecting AI, clinical usability, energy efficiency.

### 1.4 Required deliverables [BRIEF]
1. Prototype
2. Source code (organised, commented, with install/run instructions)
3. Technical documentation
4. Architecture diagram
5. Dataset / processing method
6. Model / algorithm description
7. Results with metrics
8. Live demo
9. Final presentation

### 1.5 Ethics constraints [BRIEF]
- anonymisation;
- data protection;
- data minimisation;
- confidentiality;
- informed consent for any data collected on people;
- responsible AI;
- no unauthorised diagnosis;
- no unvalidated clinical claims.

The prototype must be presented as an educational/exploratory research prototype, **not a validated medical device**.

---

## 2. Product concept

### 2.1 Name and thesis [EXISTING]
- **Name:** ALGOS‑Δ ("algos" = pain in Greek; Δ = change relative to the personal baseline).
- **Tagline:** "Arousal ≠ Pain".
- **Thesis:** most systems measure *how activated the body is*. ALGOS‑Δ also estimates *why* it is activated (pain vs. cognitive stress vs. activity/agitation). It reports pain only when pain is the most plausible explanation, and **abstains** when it cannot tell.

### 2.2 Target context [EXISTING]
- **Clinical target:** ICU, post-operative monitoring, non-communicating patients (sedated, intubated, cognitively impaired).
- **Demo reality:** healthy volunteers and public datasets of healthy adults with experimental pain. This gap must be stated honestly (see §17).

### 2.3 Users [EXISTING]

| Persona | Role in the product | Status |
|---|---|---|
| **Physician** (intensivist / anaesthesiologist) | **Primary user.** Interprets score, uncertainty, drivers and context; sets mode; acknowledges alerts | [EXISTING] decided in interview |
| ICU nurse | Performs CPOT/BPS assessments, logs procedure events, marks baseline. The physician UI exposes these as triggerable actions | [EXISTING] secondary |
| Hackathon jury | Watches the laptop + projector demo; judges science, realism and UX | [EXISTING] presentation audience |
| Central-station nurse | Watches many beds | [PLANNED] via the Unit overview screen |

### 2.4 Usage priorities (ranked by owner) [EXISTING]
1. Continuous glanceable monitoring with alerts
2. Event-driven use around procedures (suctioning, turning)
3. Scheduled pain rounds (CPOT/BPS)
4. Retrospective review of the shift timeline

**Glance goal:** "Is this patient in pain right now, and can I trust it?" answered in about 2 seconds, from projector distance.

### 2.5 Non-goals [BRIEF + EXISTING]
- no diagnosis;
- no treatment recommendations (actions are always *assessments*);
- no claim to override the clinician;
- no claim of validation in ICU populations.

---

## 3. System architecture (end to end)

### 3.1 Overview [PLANNED]
```
[ESP32 wristband] --USB serial (BLE later)--> [Python backend: FastAPI]
  PPG · EDA · Temp · IMU                        ├─ resample to Empatica E4 rates
                                                ├─ signal quality (SQI) per window
[Browser webcam → MediaPipe JS]                 ├─ baseline manager (calibration + adaptive EMA)
  facial blendshapes only (no frames)  ────────►├─ Δ-feature extraction (10 s / 1 s hop; HRV 30 s)
                                                ├─ Head A: pain intensity (quantile LightGBM + conformal)
[Replay mode: PMED / WESAD / DaLiA / in-house]─►├─ Head B: context classifier (rest/pain/stress/activity)
                                                ├─ clinical-context layer (reliability, priors, baseline corrections)
                                                ├─ fusion + abstention + alert logic
                                                ├─ SHAP → plain-language drivers
                                                └─ WebSocket (1 Hz state + telemetry) ──► [Dashboard]
```
**Key design rule:** ONE feature-extraction code path serves training, replay and live data. The live device is resampled to E4 rates so that models trained on the E4 datasets transfer.

### 3.2 Hardware: low-cost wristband [PLANNED]

| Component | Role | I²C addr | Notes |
|---|---|---|---|
| ESP32 dev board | Acquisition, streaming | — | SDA GPIO21, SCL GPIO22, 3.3 V |
| MAX30102 | PPG (IR primary): HR, IBI, pulse amplitude, perfusion index, PPG-derived respiration | 0x57 | 400 Hz internal ×4 averaging → 100 Hz; 18-bit counts |
| ADS1115 | 16-bit ADC for EDA | 0x48 | 860 SPS, averaged; the ESP32's built-in ADC is too noisy |
| GSR front-end + electrodes | EDA | — | Palmar fingers (index + middle) or plantar foot; wrist EDA avoided |
| MLX90614 (or DS18B20) | Skin temperature | 0x5A | 3.3 V version; ±0.5 °C accuracy, 0.02 °C resolution |
| MPU6050 | Motion / posture / shivering | 0x68 | ±4 g |

- Approximate total cost: under $40 (low-cost bonus).
- Firmware streams raw CSV lines at about 100 Hz over USB serial at 921600 baud: `time_ms, ir, red, eda_raw, skin_temp, ax, ay, az`.
- Worn on the **non-dominant hand**, which stays still during the cold-pressor demo.

### 3.3 Data strategy [PLANNED]

| Dataset | Content | Use | Access |
|---|---|---|---|
| **PainMonit PMED** | ~52 healthy subjects, heat pain, continuous CoVAS 0–100 self-report; RespiBAN + Empatica E4 | Head A (pain intensity), Head B (pain/rest) | figshare DOI 10.6084/m9.figshare.26965159; code github.com/gouverneurp/PMD |
| PainMonit PMCD | Physiotherapy patients with chronic pain | [SUGGESTED] external clinical check | same |
| **WESAD** | 15 subjects; baseline, TSST stress, amusement; same devices | Head B (stress) | uni-siegen.de ICMI18 page / UCI 465; **academic, non-commercial use only; cite the paper** |
| **PPG-DaLiA** | 15 subjects, daily activities; same devices | Head B (activity) | UCI 495 |
| In-house mini-study | 6–10 consenting volunteers on own hardware | Within-subject validation of pain vs. stress vs. exercise | Collected during the hackathon |

- **Why these three:** all use the same Empatica E4 + RespiBAN hardware family, so the features are comparable across pain, stress and exercise.
- **Shared channel set:** E4 wrist BVP 64 Hz, EDA 4 Hz, TEMP 4 Hz, ACC 32 Hz.
- **Not used:** BioVid, because license access is too slow.

**Leakage risk and mitigations:** a stress-vs-pain classifier trained on data from *different datasets* may learn dataset identity instead of state.
- per-session baseline normalisation;
- a **leakage probe** (predict the dataset from baseline windows; it should fail);
- the in-house within-subject test.

### 3.4 Signal processing and features [PLANNED]
- **Windows:** 10 s with 1 s hop (fast features); 30 s for HRV; 60–120 s for slow context features (LF/HF, temperature slope, EDASymp).
- **Signal quality and abstention gates:**
  - **PPG:** DC contact level, clipping > 1%, perfusion-index floor (start ≈ 0.2%, tune per device), beat-template correlation < 0.80, < 80% plausible beats (IBI 300–2000 ms, successive change < 25%), skewness SQI.
  - **EDA:** valid range 0.05–60 µS; reject slopes > ±10 µS/s (Kleckner et al. 2018); flat but in-range traces are NOT rejected (≈10% low responders).
  - **Temperature:** valid 25–40 °C; reject jumps > 0.5 °C/s.
  - **Accelerometer:** saturation and stuck-value detection; ENMO above threshold = motion gate.
  - **Face:** detection in ≥ 50% of frames; head yaw/pitch within ±30°; upper face visible.

**Feature list:**

| Signal | Features |
|---|---|
| PPG | HR; RMSSD; SDNN (Δ only); pNN50 (low priority); LF/HF (120 s window only, invalid under controlled ventilation with rate < 9/min); pulse amplitude Δ%; perfusion index; pulse rise time; **SPI-like index** = 100 − (0.33·HBI_norm + 0.67·PPGA_norm) as a clinical comparator; PPG-derived respiration rate |
| EDA | SCL mean Δ and slope; SCR count/rate (threshold 0.03–0.05 µS on low-cost hardware); amplitude sum; rise time; half-recovery; phasic AUC; max derivative; EDASymp (0.045–0.25 Hz) |
| Temperature | Distal Δ; slope over 60 s (°C/min); [SUGGESTED] proximal–distal gradient with a second sensor |
| Accelerometer | SVM, ENMO, variance, activity count, jerk, **tremor/shiver power 4–12 Hz**, posture tilt |
| Face | PSPI-proxy median (brow down + max(eye squint, cheek squint) + nose sneer + eye blink, from MediaPipe blendshapes), duty cycle, brow-lowering duration; upper-face only (endotracheal tubes hide the mouth) |

### 3.5 Baseline management [PLANNED]
- **Normalisation:** z = (x − μ_b) / max(σ_b, σ_floor). Skewed features use log1p + robust z (median/MAD). Pulse amplitude uses Δ%.
- **Calibration:** 90–120 s of rest. In the ICU, the nurse presses "Mark as baseline" after a CPOT = 0 assessment with stable RASS.
- **Adaptive update:** EMA with α = 1/1800 (≈ 30-min time constant at 1 Hz), applied ONLY when arousal |z| < 0.5, motion is low, SQIs are OK, and there was no pain episode in the last 10 min.
- **States:** CALIBRATING → ADAPTIVE; FROZEN_EPISODE during episodes; RECALIBRATION_NEEDED after vasoactive or sedation changes, fever onset, or electrode reattachment.

### 3.6 Models [PLANNED]
- **Head A — pain intensity:** LightGBM regressor on PMED (target CoVAS / 10), plus quantile models (q0.1, q0.5, q0.9) and split-conformal correction → calibrated **80% interval**.
- **Head B — context:** LightGBM 4-class classifier (rest, pain, cognitive stress, activity) on harmonised PMED + WESAD + DaLiA + in-house data.
- **Arousal index:** model-free mean of z(ΔEDA tonic), z(ΔHR) and −z(Δpulse amplitude). It drives the "naive" gauge.
- **Why gradient boosting rather than deep learning:** small subject count, tabular features, leave-one-subject-out, latency, SHAP explainability. [SUGGESTED] add a 1D-CNN comparison if time allows.
- **Training trick:** random **modality dropout** (blank channels with p = 0.2–0.3), so the model degrades gracefully when channels are masked.
- **Explainability:** SHAP TreeExplainer → top-3 drivers mapped to fixed plain-language sentences.

### 3.7 Validation protocol [PLANNED]
- **Leave-one-subject-out only.** Random window splits are forbidden, because they leak subjects and inflate scores.
- Shuffled-label negative control; trivial-mean baseline; lag alignment of CoVAS (1–3 s) chosen on training folds only.
- **Metrics:**
  - Head A: MAE, RMSE, Spearman correlation; sensitivity/specificity at NRS ≥ 4.
  - Head B: macro-F1, confusion matrix.
  - Interval: empirical coverage.
  - **Headline system metric:** *confounder false-alarm rate* = % of stress/activity windows displayed as pain ≥ 4, naive arousal model vs. ALGOS‑Δ.
- **Ablations:** with vs. without baseline normalisation; per modality.

### 3.8 Live fusion pipeline (six stages per second) [PLANNED]
1. **Channel reliability:** r_c = SQI_c × Π m(flag, c). Channels with r_c < 0.3 are set to NaN (masked).
2. **Expected-response correction (baseline route):**
   - fever: ΔHR_corr = ΔHR − k·ΔT_core, with k ≈ 8–10 bpm/°C;
   - anticholinergic / β-agonist: expected HR offset;
   - vasoactive dose change: 10–15 min washout + re-baseline.
3. **Prior shift (prior route):** P(c | x, k) ∝ P_B(c | x) · π_k(c) / π_train(c) (Saerens 2002).
4. **Unexplained-arousal detection** (Mahalanobis or isolation forest) → "Arousal of unclear cause — assess patient".
5. **Mondrian conformal intervals** per stratum (available modalities × mode). Strata absent from calibration → `coverage_validated: false`.
6. **Decision:**
   - displayed pain = Head A × P(pain) / (P(pain) + P(stress) + P(activity)) when arousal is elevated;
   - abstain if SQI fails or P(activity) > 0.6;
   - mode rule, hysteresis, persistence, rate limits.

---

## 4. Clinical context model

### 4.1 Three routes (core concept) [EXISTING — shown in UI legend "Adjusts prior / Adjusts measurement / Adjusts baseline"]

| Route | Meaning | Example | UI icon |
|---|---|---|---|
| **Prior** | Changes how likely pain is before looking at signals | Suctioning ×2.5; opioid bolus ×0.5 | Balance scale |
| **Measurement** | Changes how reliable a channel is as a readout | Beta-blocker blunts the HR readout, not the pain | Gauge |
| **Baseline** | Changes the resting reference / expected response | Norepinephrine dose change; fever | Anchor |

> **Critical principle:** opioids act on the PRIOR (true analgesia). Beta-blockers act on MEASUREMENT (masking). Treating both as "lower the score" would under-treat beta-blocked patients.

### 4.2 Clinician inputs [PLANNED; only some appear in artboards]

**Patient profile:**
- age; sex; communication status;
- latest NRS;
- latest **CPOT (0–8, > 2 = pain likely)** / **BPS (3–12, > 5)** — the realistic ICU ground truth;
- RASS (−5…+4); CAM-ICU (delirium);
- surgery type/site and time since surgery;
- skin condition at sensor sites.

**Drugs and conditions** — flag catalogue (chips):

| Flag | Type | Route | Effect | In artboards? |
|---|---|---|---|---|
| BETA_BLOCKER | persistent | measurement | HR weight 0.3, HRV 0.6; EDA unaffected (cholinergic sweat glands) | **Yes (A4)** |
| ALPHA2_AGONIST (dexmedetomidine) | persistent | measurement | HR 0.4, EDA 0.5, pulse amplitude 0.6 | No |
| ANTICHOLINERGIC | timed 60 min | measurement + baseline | EDA masked; expected HR rise | No |
| NMB (neuromuscular blockade) | persistent | measurement | Face + motion masked; behavioural assessment impossible | **Yes (A4)** |
| NOREPINEPHRINE | persistent | measurement | Pulse amplitude 0.3, temperature 0.5 | **Yes (A4)** |
| VASOPRESSOR_DOSE_CHANGE | timed 15 min | baseline | Pulse amplitude/temp masked during washout; re-baseline | No |
| OPIOID_BOLUS | timed 30 min | prior | Pain prior ×0.5 | No |
| FEVER | persistent | baseline + measurement | HR corrected for core temp; shivering = thermoregulatory | No |
| HYPOTHERMIA | persistent | measurement | Shivering and vasoconstriction expected | No |
| AUTONOMIC_NEUROPATHY | persistent | measurement | EDA 0.3, HRV 0.4 | No |
| ATRIAL_FIBRILLATION | persistent | measurement | HRV disabled | No |
| PACED_RHYTHM | persistent | measurement | HR + HRV disabled | No |
| CONTROLLED_VENTILATION | persistent | measurement | Respiration + HF-HRV disabled | **Yes (A1, A3, A5)** |
| SCI_T6_OR_ABOVE | persistent | measurement (inverted) | Bradycardia + sweating may signal autonomic dysreflexia | No |
| SUCTIONING | timed 2 min | prior | Pain prior ×2.5 | **Yes (A1)** |
| TURNING | timed 3 min | prior | Pain prior ×2 | No |
| GENTLE_TOUCH | timed 2 min | prior | Non-nociceptive arousal expected | No |
| FAMILY_VISIT | timed 20 min | prior | Stress prior ×1.5 | **Yes (A2)** |

All modifier values are **expert priors to be documented and validated**, not literature constants.

### 4.3 Reliability modifier matrix m(flag, channel) [PLANNED]

| Flag | HR | HRV | Pulse amp / PI | EDA | Temp | Motion | Face |
|---|---|---|---|---|---|---|---|
| Beta-blocker | 0.3 | 0.6 | 1 | 1 | 1 | 1 | 1 |
| α2 agonist | 0.4 | 0.5 | 0.6 | 0.5 | 1 | 1 | 0.8 |
| Anticholinergic | 0.2 | 0.5 | 1 | 0 | 1 | 1 | 1 |
| NMB | 1 | 1 | 1 | 1 | 1 | 0 | 0 |
| Norepinephrine (stable) | 0.8 | 0.8 | 0.3 | 1 | 0.5 | 1 | 1 |
| Vasopressor dose change | 0.5 | 0.5 | 0 | 1 | 0 | 1 | 1 |
| Fever / sepsis | 0.6 | 0.4 | 0.5 | 0.7 | 0.3 | 0.7 | 1 |
| Autonomic neuropathy | 0.6 | 0.4 | 0.8 | 0.3 | 0.8 | 1 | 1 |
| Atrial fibrillation | 1 | 0 | 0.8 | 1 | 1 | 1 | 1 |
| Paced rhythm | 0 | 0 | 1 | 1 | 1 | 1 | 1 |
| Controlled ventilation | 1 | 0.5 (HF band 0) | 0.7 | 1 | 1 | 1 | 1 (upper face) |

### 4.4 Decision matrix highlights [PLANNED]
- **High EDA + high HR on stable norepinephrine:** EDA stays interpretable (cholinergic); pulse amplitude is uninformative (floor effect); the interval is wider.
- **Pulse amplitude drop + temperature drop with flat EDA, just after a norepinephrine dose increase:** drug effect, not pain → washout.
- **Beta-blocker:** the absence of an HR rise is NOT evidence against pain.
- **Atropine just given:** HR rise is expected; EDA is masked. If face and motion are also unavailable → REJECTED + "perform CPOT/BPS" (CONTEXT_UNASSESSABLE).
- **NMB:** autonomic signals only; banner "behavioural assessment impossible".
- **Fever, rising phase:** shivering is thermoregulatory. **Defervescence:** tonic EDA rise is explained by sweating.
- **Hypoglycaemia pattern** (EDA ↑, HR ↑, tremor) → unexplained-arousal flag + "check glucose" prompt.
- **SCI ≥ T6:** bradycardia + sweating → urgent prompt to look for a noxious trigger and check blood pressure.
- **Motion in ICU mode = agitation** (a CPOT/BPS item), not exercise. **Motion in Ward mode = activity** → abstain.

---

## 5. Data contract (engine → dashboard) [PLANNED]

### 5.1 Inbound `state` message (1 Hz)
```json
{
  "type": "state",
  "schema_version": "1.0",
  "patient_ref": "P-7F3A",
  "timestamp": "2026-10-02T14:31:07Z",
  "mode": "ICU_HIGH_SENSITIVITY | WARD_HIGH_SPECIFICITY",
  "status": "OK | DEGRADED | REJECTED",
  "abstain_reasons": [],
  "pain": {
    "score": 5.8,
    "interval": {"low": 3.6, "high": 7.9, "coverage": 0.8, "stratum": "eda+hr+acc", "coverage_validated": false},
    "trend": {"direction": "rising | falling | stable", "slope_per_min": 0.9},
    "episode": {"state": "none | active | resolving", "onset": "…", "peak_score": 6.2}
  },
  "arousal": {"index_z": 2.1, "level": "LOW | MODERATE | HIGH"},
  "attribution": {"pain": 0.62, "cognitive_stress": 0.16, "activity_or_agitation": 0.10, "rest": 0.04, "unexplained": 0.08},
  "drivers": [{"feature": "eda_scr_rate", "sensor": "eda", "direction": "up", "raw": 9.0, "unit": "/min",
               "baseline": 2.1, "z": 2.8, "shap": 0.41, "text_en": "…", "text_fr": "…"}],
  "channels": {"ppg": {"state": "OK", "sqi": 0.92, "reliability": 0.28, "notes": ["BETA_BLOCKER"]},
               "eda": {}, "temp": {}, "acc": {}, "face": {}},
  "context_applied": [{"flag": "BETA_BLOCKER", "route": "measurement", "effect_en": "HR weight 0.3"}],
  "baseline": {"calibrated_at": "…", "state": "CALIBRATING | ADAPTIVE | FROZEN_EPISODE | RECALIBRATION_NEEDED"},
  "alert": {"active": true, "level": "ADVISORY", "rule": "upper80 >= 4 for 30 s", "recommended_action": "PERFORM_CPOT"},
  "reference": {"last_cpot": {"value": 1, "time": "…"}, "last_nrs": null},
  "model": {"version": "algos-delta-0.3", "validated_population": "healthy adults, experimental pain"},
  "disclaimer": "Research prototype…"
}
```

### 5.2 Other messages
- **Inbound:**
  - `telemetry` — `{t0, fs: 25, ppg[], eda[], temp[], acc[]}`, about 4 batches/s;
  - `event` — `{event, t, duration_s}`.
- **Outbound:** `context_flag {flag, active}`, `mode_change {mode}`, `ack_alert {alert_id}`, `cpot_entry {scale, items, total, note}`, `mark_baseline {}`, `event {event, t}`.

### 5.3 Enumerations
- **`abstain_reasons`:** PPG_NO_CONTACT, PPG_CLIPPING, PPG_LOW_PERFUSION, PPG_TEMPLATE_MISMATCH, EDA_OUT_OF_RANGE, EDA_SLOPE_ARTIFACT, MOTION_ARTIFACT, INSUFFICIENT_MODALITIES, BASELINE_NOT_CALIBRATED, VASOACTIVE_WASHOUT, CONTEXT_UNASSESSABLE.
- **Status semantics:**
  - **OK** = PPG and EDA valid, motion gate inactive, baseline calibrated.
  - **DEGRADED** = at least one channel masked, but (EDA or PPG) + accelerometer valid.
  - **REJECTED** = neither EDA nor PPG valid, OR motion gate with no valid channel, OR no baseline, OR context unassessable.
- **Channel display states:** OK, DEGRADED, REJECTED, **MASKED** (by clinical context). MASKED is an [EXISTING] UI state that has no `channels[*].state` value in the schema — see §19.

---

## 6. Information architecture and navigation

### 6.1 Sitemap
```
Sign in [PLANNED A11]
 └─ Unit overview · ICU [PLANNED A12]  (nav tab "Unit")
     └─ Patient (Bed N)
         ├─ Calibration (first 90 s) [PLANNED A9]
         ├─ Monitor (main dashboard) [EXISTING A1–A4, A7]
         │    ├─ Alert banner → Acknowledge / Assess
         │    ├─ CPOT/BPS dialog [EXISTING A5]
         │    ├─ ICU↔Ward confirm popover [PLANNED A10]
         │    ├─ Add-context popover (searchable flag list) [PLANNED, not designed]
         │    ├─ Settings sheet (WebSocket URL, time scale, seed) [PLANNED in code prompt]
         │    └─ Help "?" shortcut popover [PLANNED in code prompt]
         ├─ Timeline tab [OPEN — tab exists in header, no screen designed]
         ├─ Assessments tab [OPEN — tab exists, no screen designed]
         └─ Audit trail (drawer) [EXISTING A6]
Session locked overlay [PLANNED A13]
Demo director panel (hidden, Shift+D) [PLANNED]
```

### 6.2 Global header [EXISTING]
- **Left:** ALGOS‑Δ wordmark (yellow-triangle Δ mark), patient pill "P-7F3A · Bed 4 · ICU · Post-op day 1".
- **Centre:** pill nav Monitor (active, dark) · Timeline · Assessments · Audit trail.
- **Right:**
  - ICU | Ward segmented control, plus rule text (e.g. "Alert: upper 80% bound ≥ 4 for 30 s");
  - connection pill ("● Simulator");
  - baseline pill ("Baseline: adaptive", with anchor icon);
  - theme button (moon/sun), language "EN", help "?", clinician initials "DR".
- **State-dependent pill:** a slate pill "Assessment unavailable" appears in the abstention state (A3).

### 6.3 Context bar [EXISTING]
- Left label "Clinical context".
- Chips: persistent chips are marked "Persistent"; timed chips show a countdown ring (e.g. "Suctioning · 1:24 left").
- A dashed "+ Add context" chip.
- Right side: a legend "Adjusts prior · Adjusts measurement · Adjusts baseline" with route icons, and the "Mark as baseline" button.

### 6.4 Alert slot [EXISTING]
A fixed-height row, always reserved so the layout never jumps. Variants:
- red alert banner (A1);
- amber advisory (A3, A4);
- "No active alerts" with dashed outline (A2);
- yellow banner in high contrast (A7);
- [PLANNED] acknowledged strip.

### 6.5 Main grid [EXISTING]
Three columns: left ~440 px · centre flexible · right ~440 px.

| Left column | Centre | Right column |
|---|---|---|
| Pain hero card | Body stage (silhouette, sensor hotspots, driver callouts, tool rail, sensor legend) | Attribution card "What is driving the arousal?" |
| Arousal vs pain card (pastel blue) | Floating timeline card "Last 10 minutes" | Top drivers card ("vs this patient's baseline") |
| | | Live signals card (dark, monitor-style) |

- **Footer:** disclaimer + "Model algos-delta-0.3".

---

## 7. User flows

### 7.1 Demo flow (jury) [PLANNED]
Sign in ("Enter demo mode") → Unit overview → Bed 4 → Calibration (90 s, compressible) → the four acts:

| Act | Screen | Purpose |
|---|---|---|
| 1 Calibration | A9 | Every body is different (personal baseline) |
| 2 Stress | A2 (shown in the Projector theme on stage) | Arousal rises, pain stays low — "the trap" |
| 3 Pain | A1 | Pain rises, alert fires, drivers explain |
| 4 Motion | A3 | The system knows when not to answer |

- **Live version:** volunteer does mental arithmetic aloud (stress), then a ≤60 s cold-pressor test (pain), then shakes the arm (motion).
- **Then:** results slide (leave-one-subject-out metrics, confounder false-alarm rate, ablation) and limitations slide.
- **Backup:** replay mode / recorded video / clickable prototype.

### 7.2 Alert flow [EXISTING design + PLANNED logic]
1. The condition is met (ICU: upper 80% bound ≥ 4 for 30 s) → red banner, with "Possible unmanaged pain", rule text, onset time and elapsed time.
2. The clinician clicks **Acknowledge** → banner collapses to the acknowledged strip; audit entry written.
3. If the condition persists → re-escalation after 3 min (ICU) / 10 min (Ward).
4. Or the clinician clicks **Assess CPOT / BPS** → dialog opens → save → diamond marker on the timeline + audit entry + toast.

### 7.3 Abstention flow [EXISTING A3]
1. Signal quality fails (e.g. motion) → status REJECTED.
2. Hero becomes the abstention card: reasons and a "Perform CPOT / BPS" button. The last valid score is shown dimmed with its age ("Last valid 5.9 · 45 s ago").
3. Gauges paused; attribution and drivers show empty states; telemetry shows "Signal rejected: motion".
4. Timeline shows a hatched "Abstention" region.
5. ICU mode: amber advisory in the alert slot. No pain alert can fire while REJECTED.
6. After 300 s the stale score is hidden ("Stale values are hidden after 5 minutes").

### 7.4 Context flag flow [EXISTING design A4 + PLANNED logic]
1. Click "+ Add context" → searchable popover → choose a flag → chip appears.
2. Hovering the chip shows a tooltip with route + effect (e.g. "Measurement · Heart-rate weight reduced to 0.3. Skin conductance unaffected (sweat glands are cholinergic).").
3. Effects are immediately visible:
   - reliability rings change;
   - masked hotspots appear (dashed + slash-lock);
   - the interval widens;
   - drivers get weight badges ("weight ×0.3");
   - badges such as "Reduced sensors: face, motion" and "Coverage not validated for this context";
   - advisory banners (NMB).
4. Timed flags also create timeline markers and count down.
5. Every toggle is audited.

### 7.5 Mode switch flow [PLANNED A10]
ICU → Ward triggers a confirm popover stating the new rule in plain language. On confirm, the header rule text updates and an audit entry is written. A "Compare modes" switch on the timeline shows ghost triangles where the other mode would have alerted.

### 7.6 CPOT/BPS flow [EXISTING A5]
- Quick entry (0–8 chips) by default.
- "Full scale" expands four items, each as 3-option segmented controls with descriptors.
- An "Intubated / Extubated → Vocalization" toggle switches the third item.
- Live total ("Total 4 / 8") + chip "Pain likely (> 2)".
- Optional note; muted reference line "Current ALGOS‑Δ estimate: 6.4 (80% interval 4.3 – 8.1) — shown for reference only."
- Cancel / Save assessment.
- BPS tab [PLANNED, not designed]: 3 items × 1–4, total 3–12, > 5 = pain likely.

### 7.7 Calibration flow [PLANNED A9]
- Header "Baseline: calibrating"; info strip "keep the patient at rest".
- Progress ring "0:54 / 1:30"; sensor checklist; live mini-values.
- Empty states "Available after calibration".
- Then auto-switch to monitoring.

### 7.8 Session flow [PLANNED A11, A13]
- Sign in: SSO button or Staff ID + password, role (Physician | Nurse), unit; or "Enter demo mode".
- Auto-lock after 5 min idle (or Ctrl+L). PIN unlock; "Switch user".
- Monitoring continues in the background while locked.

---

## 8. Screens / artboards

All artboards are 1920 × 1080 (16:9).

### A1 — Main · Projector · Pain episode [EXISTING]
ICU mode, alert fired, all signals OK, *demo values*.

| Area | Content |
|---|---|
| Context | Controlled ventilation (Persistent); Suctioning · 1:24 left |
| Alert | Red: "Possible unmanaged pain · Rule: upper 80% bound ≥ 4 for 30 s · since 14:31:40 (1 min 12 s)" · Acknowledge · Assess CPOT / BPS |
| Hero | 6.4 /10, "Moderate" pill (amber fill + bar icon), 0–10 scale with grey interval band 4.3–8.1 and marker, band labels Mild 0–3 / Moderate 4–6 / Severe 7–10 with coloured underline segments, "↑ 0.9 /min trend", "Signals OK", "Episode active since 14:30:21 · 2 min 31 s" |
| Gauges | Arousal z 2.6 "↑ High"; Pain 6.4 "Moderate"; explanatory caption |
| Body | Face, PPG, EDA, Motion, Temp hotspots (filled teal = OK); EDA highlighted with a halo; callouts: brow lowering (z 1.9), frequent SCRs 9/min (baseline 2, z 2.8), pulse amplitude −38% (vasoconstriction, z −2.3); tool rail (Sensor labels, Drivers, Front/back, Zoom); legend OK/Degraded/Rejected |
| Attribution | Pain 68% (black), Cognitive stress 14% (purple), Agitation 8% (salmon), Rest 3% (grey), Unexplained 7% (hatched) |
| Drivers | Row 1 in hover state with tooltip "Raw 9.0 /min · baseline 2.1 · z 2.8 · contribution +0.41 · sensor reliability 0.95"; rows 2–3: pulse amplitude +0.29, brow lowering +0.18 |
| Timeline | Last 10 min (5/10/30 toggle), Compare modes off; pain line, interval band, arousal dashed (z right axis), suctioning region (yellow), alert triangle 14:31:40, "CPOT 1 · 13:58 (35 min ago, before window)" marker at the left edge |
| Telemetry | PPG HR 104 bpm, EDA 7.8 µS, Skin temp 32.1 °C, Motion 0.02 g, all OK; yellow round action button |

### A2 — Night · Arousal ≠ Pain [EXISTING]
Night theme, cognitive stress, no alert.
- **Context:** Family visit · 14 min left (prior).
- **Alert slot:** "No active alerts".
- **Hero:** 1.8 /10 "Mild", interval 0.6–3.2, info chip "High arousal — not attributed to pain", "→ stable".
- **Gauges:** z 2.5 High **≠** 1.8 Mild (an explicit "≠" symbol between the gauges).
- **Attribution:** Stress 64%, Pain 12%, Agitation 9%, Rest 8%, Unexplained 7%.
- **Drivers:** tonic SCL +1.9 µS (9.6 vs 7.7, +0.05); HR +14 bpm (92 vs 78, +0.04); irregular breathing z 1.6 (derived from PPG, −0.03).
- **Body:** a "Breathing · PPG-derived" diamond marker on the chest; the legend adds "Derived signal".
- **Timeline:** 20:33–20:41, family-visit region, bracket annotation "Arousal ≠ Pain".
- **Telemetry:** HR 92, EDA 9.6, 32.6 °C, 0.03 g.

### A3 — Abstention · Motion artifact [EXISTING]
- **Header pill:** "Assessment unavailable".
- **Advisory (amber):** "Automated assessment unavailable — perform CPOT / BPS", with button.
- **Hero → abstention card:** "Last valid 5.9 · 45 s ago"; reasons "Movement artifact — pulse waveform irregular" and "High motion on wrist sensor"; "Perform CPOT / BPS"; note "Stale values are hidden after 5 minutes".
- **Gauges:** "Paused — signals unreliable", dashes.
- **Body:** Face OK, PPG rejected (crossed), EDA degraded, Motion degraded with motion waves, Temp OK; tool rail "Drivers · none".
- **Attribution:** "No attribution while signals are rejected."
- **Drivers:** empty state "No drivers to show — Drivers return once pulse and motion signals are reliable again."
- **Timeline:** alert 14:31:40, suctioning region, "CPOT 5 · 14:33:40" diamond, "Abstention · 14:36:10 – now" hatched region.
- **Telemetry:** PPG "HR —" Rejected with overlay "Signal rejected: motion"; EDA 7.1 µS Degraded; Temp 32.0 OK; Motion 0.84 g Degraded.

### A4 — Degraded · Clinical context [EXISTING]
- **Chips:** Neuromuscular blockade, Norepinephrine, Beta-blocker (hover tooltip shown).
- **Advisory:** "Neuromuscular blockade — behavioural assessment impossible. Autonomic signals only."
- **Hero:** 5.2 /10 Moderate, interval 2.9–7.8 "wider, fewer sensors"; badges "Reduced sensors: face, motion" and "Coverage not validated for this context".
- **Gauges:** z 1.9 "↑ Elevated"; pain 5.2.
- **Body:** Face and Motion "Masked (NMB)" (dashed + slash-lock), PPG "Reliability 0.28 · beta-blocker" (orange), EDA and Temp OK.
- **Attribution:** Pain 58, Stress 17, Rest 10, Unexplained 15, Agitation n/a (motion masked).
- **Drivers:** SCR 8.0 vs 2.1 (+0.38); SCL 10.2 vs 7.8 µS (+0.22); HR +6 bpm (71 vs 65) "weight ×0.3" (+0.03).
- **Timeline:** "NMB bolus 14:44:00" context event, acknowledged alert triangle, legend "Context event" and "Alert (acknowledged)".
- **Telemetry:** PPG reliability 0.28 Degraded HR 71; EDA 10.2 OK; Temp 31.8 OK; Motion "Masked".

### A5 — CPOT / BPS assessment dialog [EXISTING]
Over A1 with a 40% scrim. Header meta "P-7F3A · Bed 4 · 14:33". Quick entry with 4 selected; full CPOT scale with every item at 1; total 4 / 8 "Pain likely (> 2)"; intubated toggle ON; note field; reference line; Cancel / Save assessment (with check icon).

### A6 — Audit trail drawer [EXISTING]
Right drawer over A1. "P-7F3A · Bed 4 · newest first"; filters All / Alerts / Context / Assessments / Mode / System; Export JSON; close button. "Today" group with entries:

| Time | Actor | Action | Detail |
|---|---|---|---|
| 14:32:52 | Clinician · DR | Alert acknowledged | "Possible unmanaged pain" |
| 14:31:40 | System | Alert fired | Rule upper 80% bound ≥ 4 for 30 s · pain 6.1 (4.0 – 7.9) |
| 14:30:05 | Clinician · DR | Context added | Suctioning (prior ×2.5, 2 min) |
| 14:12:00 | Clinician · DR | Mode changed | Ward → ICU (confirmed) |
| 13:58:30 | Clinician · DR | CPOT recorded | Total 1 / 8 |
| 13:58:10 | Clinician · DR | Baseline marked | — |
| 13:40:00 | System | Connection | Simulator mode |

### A7 — High-contrast accessibility [EXISTING]
Same content as A1:
- black background, white 2 px borders, white text;
- yellow (#FFE14D) accents and banner;
- pattern-coded severity bands and attribution segments;
- sensor-state legend including "Masked by context · dashed";
- 4 px yellow focus ring on "Acknowledge".

### Planned artboards [PLANNED — prompts written, not built]

| # | Name | Key content |
|---|---|---|
| A8 | Component sheet | Every component in every state, FR hero variant, token swatches for 3 themes |
| A9 | Calibration · first 90 s | Progress ring 0:54/1:30, sensor checklist, empty states |
| A10 | Acknowledged · Ward · Compare | Acknowledged strip "re-escalates in 8 min", Ward rule, compare-mode ghost triangles, ICU→Ward confirm popover |
| A11 | Sign in | Split layout, SSO + Staff ID/password, role, unit, demo mode, lock note, amber (not red) error variant |
| A12 | Unit overview · ICU | Summary stat cards; 8 bed cards sorted by priority (Bed 4 alert = only red; Bed 7 unavailable; Bed 2 reduced sensors; Bed 9 calibrating) |
| A13 | Session locked | Blurred dashboard, PIN unlock, "monitoring continues" note |

---

## 9. Component catalogue

| Component | States / variants | Status |
|---|---|---|
| Header | default; abstention pill; theme/lang variants | EXISTING |
| Patient pill | — | EXISTING |
| Pill nav | active / inactive | EXISTING |
| ICU/Ward segmented control | ICU / Ward; confirm popover | EXISTING (control) / PLANNED (popover) |
| Connection pill | Live, Simulator, Reconnecting (pulsing amber), Offline (grey) — dot + text | EXISTING (Simulator) / PLANNED (others) |
| Baseline pill | calibrating / adaptive / frozen / recalibration needed | EXISTING (adaptive) |
| Context chip | persistent; timed with countdown ring; hover tooltip; "+ Add context" dashed | EXISTING |
| Route legend | prior / measurement / baseline | EXISTING |
| Alert slot | empty ("No active alerts"); red alert; amber advisory; acknowledged strip; HC yellow | EXISTING except acknowledged |
| Pain hero card | mild/moderate/severe; info chip; degraded badges; coverage-not-validated badge; abstention card; stale score | EXISTING |
| Scale bar | 0–10 ticks, grey interval band, marker, band underline segments + labels | EXISTING |
| Arousal vs pain gauges | values; "≠" variant; paused | EXISTING |
| Body map | silhouette; hotspots OK / degraded / rejected / masked / derived (diamond) / highlighted (halo); labels; callouts with leader lines; motion waves | EXISTING |
| Tool rail | Sensor labels, Drivers, Front/back, Zoom (active = dark circle) | EXISTING (visual; behaviour not specified) |
| Attribution bar | standard; HC patterns; empty; "n/a" segment | EXISTING |
| Driver row | default; hover with tooltip; weight badge; degraded-source warning | EXISTING (first three) |
| Timeline | 5/10/30 window; compare toggle; pain line; interval band; arousal dashed; event region; context-event line; CPOT diamond; alert triangle (active/acknowledged); abstention hatch; annotations; off-window marker | EXISTING |
| Telemetry card | per channel OK / Degraded / Rejected overlay / Masked | EXISTING |
| CPOT/BPS dialog | quick / full; CPOT / BPS tabs; intubated toggle | EXISTING (CPOT) |
| Audit drawer | filters; entries; export | EXISTING |
| Demo director | floating panel | PLANNED |
| Session lock | PIN | PLANNED |
| Toast | "Reference score recorded" | PLANNED |

---

## 10. Design system

### 10.1 Visual direction [EXISTING]
Inspired by (not copied from) a reference health dashboard supplied by the owner:
- airy light canvas with a soft warm-ivory → cool-mist background;
- floating white cards, radius 24, very soft shadow;
- dark active pills; pastel butter/sky info cards;
- big bold numerals with small unit suffixes;
- one dark feature card (telemetry) with a round butter-yellow action button;
- a central figure with hotspot dots; a faint perspective floor grid.

**Prohibited:** photorealistic anatomy, the reference's branding, consumer elements (appointments, medicines, photo avatars), emoji, gradients inside cards, decorative animation.

### 10.2 Typography [EXISTING]

| Use | Spec |
|---|---|
| Typeface | Plus Jakarta Sans; tabular numerals for every number |
| Hero numeral | 144 px bold; "/10" at 32 px regular |
| Card title | 18 px semibold |
| Body | 16 px |
| Label | 14 px |
| Minimum size | 13 px |
| Case | Sentence case |

### 10.3 Colour tokens

**Projector (default):**

| Token | Hex |
|---|---|
| Page | #F8F4E6 → #E9F0F8 (subtle) |
| Card | #FFFFFF |
| Border | #E6E9EE |
| Ink | #111418 |
| Text secondary / muted | #3F4A56 / #5E6A77 |
| Pastel butter / sky | #FBEFA6 / #DCEAFB |
| Action yellow | #F6D84C |
| Accent | #1F5FA8 |
| Pain mild / moderate / severe | #2F8F6B / #B7791F / #B5475A |
| Interval band | #BCC5CF |
| Alert | #C62828 |
| Advisory | #FFF3DC / #B7791F / #6B4500 |
| Sensor OK / degraded / rejected | #0E7C86 / #C77700 / #5E6A77 |
| Monitor card | #111418 |
| Traces PPG / EDA / temp / motion | #4FD1C5 / #F6AD55 / #90CDF4 / #CBD5E0 |

**Night:**

| Token | Hex |
|---|---|
| Page | #0D1117 |
| Card / border | #161B22 / #242C36 |
| Text | #E6EDF3 / #A3AFBC / #7A8794 |
| Pastels | #3A3522 / #1E2B3A |
| Action yellow | #E9CB45 |
| Pain | #5FB38A / #D9A441 / #D46A78 |
| Interval | #4A5663 |
| Alert | #D32F2F |
| Sensors | #3FB6BF / #E09A2B / #7A8794 |
| Monitor | #0A0D12 |

**High-contrast:** black page and cards, 2 px white borders, white text, #FFE14D accent, focus ring and alert background (black text on the alert), patterns on every colour-coded element, AAA contrast.

**Attribution palette [EXISTING, not in the original token spec]:** pain = ink/black, cognitive stress = purple, agitation = salmon/orange, rest = grey, unexplained = grey diagonal hatch.

### 10.4 Shape, spacing, icons [EXISTING]
- 8 px grid; outer padding 32; card gaps 24; card radius 24; dialog radius 28.
- Shadow 0 8px 24px rgba(17,20,24,.06).
- Outline icons, 1.75 px stroke; round icon buttons 44 px.

### 10.5 Non-negotiable UX rules [EXISTING]
1. Saturated red = alert semantics only (alert banner; small alert triangles on timelines; the alert badge on Unit overview).
2. Uncertainty is always neutral grey.
3. Colour never carries meaning alone (text, shape, pattern, position).
4. Pastel = neutral information, never severity.
5. Every non-live value shows its age; stale scores are hidden after 300 s.
6. Recommended actions are assessments, never treatments.
7. Permanent non-diagnostic disclaimer.
8. No decorative animation. Scores update instantly with a 150 ms fade (no number tweening). Interval width animates over 300 ms. A single gentle pulse on a new alert, disabled under reduced motion.
9. Abstention is never silent (ICU).
10. Every automated adjustment is explainable on hover; every human action is audited.
11. The clinician's scale entry is the reference; the UI never implies the system overrides it.

### 10.6 Responsive behaviour
- **Target:** 1920 × 1080 landscape, no page scroll [EXISTING]. Must degrade gracefully to 1366 × 768 [PLANNED].
- **Mobile/tablet:** not designed [OPEN — see §19].

### 10.7 Internationalisation [PLANNED]
EN/FR toggle covering every string. Examples:
- "Douleur estimée", "Intervalle à 80 %", "Douleur probable", "Évaluation automatique indisponible", "Réaliser une évaluation CPOT / BPS";
- French disclaimer: "Prototype de recherche — ceci n'est pas un dispositif médical…".

All current artboards are EN only.

---

## 11. Interactions and micro-interactions

### 11.1 Hover and click behaviours [EXISTING design + PLANNED behaviour]
- **Driver row ↔ body hotspot:** bidirectional highlight. The hotspot gets a halo; the tooltip shows raw value, baseline, z, contribution and sensor reliability.
- **Body hotspot hover:** sensor name, SQI, reliability r_c, notes.
- **Context chip hover:** route + effect + duration.
- **Context chip click:** toggle with 150 ms scale feedback. The reliability ring changes immediately.
- **Timeline:**
  - hover → synced crosshair + tooltip (time, pain, interval, arousal, status, active flags);
  - clicking an event marker opens a detail popover.
- **Alert banner:** slides into its reserved slot with no layout shift.
- **Theme switch:** instant.

### 11.2 Accessibility behaviours [PLANNED]
- `aria-live="assertive"` only for alerts and abstention changes, never for the 1 Hz score.
- Real buttons, labelled inputs, `aria-label` on icon buttons; visible focus rings.

### 11.3 Keyboard shortcuts [PLANNED]

| Key | Action |
|---|---|
| `A` | Acknowledge alert |
| `C` | Open CPOT/BPS |
| `T` | Cycle theme |
| `L` | Toggle language |
| `M` | Mode confirm |
| `H` | Audit trail |
| `Shift+D` | Demo director |
| `Ctrl+L` | Lock session |
| `Esc` | Close dialogs |
| `?` | Shortcut help |

---

## 12. Business rules

| Rule | Value | Status |
|---|---|---|
| ICU alert | Upper 80% bound ≥ 4 for 30 consecutive s (or P(pain) ≥ 0.4) | PLANNED / EXISTING text |
| Ward alert | Lower 80% bound ≥ 4 for 60 s AND attribution.pain ≥ 0.6 | PLANNED |
| Ward rate limit | Max 1 new alert per 15 min unless the score rises ≥ 2 | PLANNED |
| Re-escalation after acknowledge | 3 min (ICU) / 10 min (Ward) if the condition persists | PLANNED |
| No pain alert when | status = REJECTED (amber advisory instead, ICU) | PLANNED |
| Episode start / end | ≥ 4 for 5 s / < 2 for 10 s (hysteresis) | PLANNED |
| Stale score | Shown dimmed with age; hidden after 300 s | EXISTING (text) / PLANNED (logic) |
| Calibration | 90 s rest (90–120 s in the science spec) | PLANNED |
| Adaptive baseline | EMA α = 1/1800 under calm, still, good-quality, no-episode conditions | PLANNED |
| Vasoactive washout | 10–15 min channel masking + re-baseline | PLANNED |
| Abstain on activity | P(activity) > 0.6 (Ward) | PLANNED |
| CPOT positive | Total > 2 (0–8) | EXISTING |
| BPS positive | Total > 5 (3–12) | PLANNED |
| Mode change | Requires confirmation; audited | PLANNED |
| Threshold tuning | Fix the ICU sensitivity target (e.g. ≥ 0.90) on validation, maximise specificity | PLANNED |
| Auto-lock | 5 min idle; PIN unlock | PLANNED |
| Demo time scale | ×1 / ×5 / ×10 compresses alert timers | PLANNED |

---

## 13. Edge cases

**Documented:**
1. Sensor detached → EDA_OUT_OF_RANGE, flat trace, REJECTED.
2. Motion artifact → PPG rejected, motion degraded, abstention (A3).
3. Low electrodermal responder → flagged, not rejected.
4. Atrial fibrillation (HRV meaningless); paced rhythm (HR meaningless).
5. NMB → no behavioural signals; NMB + anticholinergic → CONTEXT_UNASSESSABLE.
6. Vasopressor dose change → washout.
7. Fever/defervescence; hypothermia shivering.
8. SCI ≥ T6 inverted response; hypoglycaemia mimic; hyperactive delirium (agitation ambiguity).
9. Baseline drift; baseline frozen during episodes.
10. WebSocket unavailable → reconnect ×3 then simulator fallback.
11. Patient groups outside the validated population → `coverage_validated: false`.
12. Pain while another chip is timed (suctioning) → prior boost visible in the audit.

**Not yet covered** [SUGGESTED to add]:
13. Patient already in pain at calibration, so no calm baseline exists (common in post-op ICU).
14. Two simultaneous alerts / an alert during the CPOT dialog / an alert while locked.
15. Clinician acknowledges, then the patient's status becomes REJECTED.
16. Context flag added retroactively (the event happened 10 min ago).
17. Language or theme switch while a dialog is open.
18. Clock/timezone display; the session crossing midnight on the timeline.
19. Face module enabled but the patient is turned away (prone position).
20. A CPOT entered that strongly disagrees with the estimate (e.g. CPOT 0 vs estimate 7).

---

## 14. Technical and product constraints affecting UX

| Constraint | Impact |
|---|---|
| claude.ai artifact preview cannot reach `ws://localhost` | Inside claude.ai the dashboard always runs the simulator; the real backend needs a local Vite project |
| claude.ai artifacts: no localStorage/sessionStorage | All state in React memory; audit export via Blob download |
| Tailwind core utilities only (no arbitrary values), lucide-react 0.383.0, recharts | Themes implemented as JS token → class maps; icons may need fallbacks |
| Projector display | Large type, high contrast, Projector theme default; dark themes look muddy on projectors |
| 1 Hz state updates; telemetry 25 Hz | Telemetry kept in refs/SVG at ≤ 10 fps, not React state |
| Training data = healthy adults, experimental pain | Every ICU use is outside validation; must be visible |
| WESAD licence (non-commercial) | Academic hackathon use OK; cite it |
| Hackathon rules on pre-written code | Unknown [OPEN]; check before using pre-built code |
| Cold-pressor demo | Needs organiser approval, consent, exclusions, 60 s cap |
| Time: 3 days | Priority order and cut list (see §16) |

---

## 15. Simulation and demo

### 15.1 Simulator [PLANNED]
- **Determinism:** seeded PRNG (mulberry32, seed 42) for reproducible rehearsals.
- **Smoothing:** values approach scenario targets with τ = 5 s, plus small noise.
- **Synthetic telemetry:**
  - PPG pulse wave at the current HR × amplitude;
  - EDA tonic + phasic bumps at the current SCR rate;
  - temperature drift;
  - motion noise.

| Scenario | Targets |
|---|---|
| CALIBRATION | 90 s ring, no score → REST |
| REST | pain ≈ 0.5, arousal ≈ 0 |
| STRESS | pain 1.8 (0.6–3.2), z 2.5, stress 64%, info chip, no alert |
| PAIN | pain 6.4 (4.3–8.1), z 2.6, pain 68%, episode, ICU alert after 30 s |
| MOTION / SENSOR_DETACHED | REJECTED, abstention card, noisy or flat traces |
| CONTEXT (beta-blocker / NMB / norepinephrine) | pain 5.2 (2.9–7.8), masked/degraded channels |

- **Demo director (Shift+D):** labelled "Demo controls — not part of the clinical interface"; scenario buttons, time scale, reset, and "Run full demo" (Calibration → Stress 40 s → Rest 15 s → Pain 50 s → Motion 20 s).
- **Unit overview:** Bed 4 runs the script; the other beds run gentle random walks.

### 15.2 Prototype levels
1. **Static artboards (A1–A7)** [EXISTING].
2. **Clickable Claude Design prototype** linking the artboards, with a director panel [PLANNED, Prompt B].
3. **Live React simulation** [PLANNED, Prompt C].
4. **Real backend + wristband** [PLANNED].

### 15.3 Live demo protocol and safety [PLANNED]
- **Volunteer:** a team member, sensors on the non-dominant hand.
- **Sequence:** rest 2 min → serial subtraction aloud 1.5 min → recovery → cold pressor ≤ 60 s (~4 °C, withdraw any time) → recovery → squats 30 s.
- **Ratings:** spoken NRS every 10 s, logged by a teammate. Speech is balanced across the stress and pain conditions.
- **Exclusions:** cardiovascular disease/hypertension, Raynaud's, cold-related conditions, broken skin.
- **Ethics:** written consent and organiser approval required. Fallback: replay mode.

---

## 16. Project status and roadmap

### 16.1 Done
- Brief analysis; solution concept; science, data, model and fusion specifications.
- Architecture diagram (shared in chat).
- Repository and dataset links.
- Clinical parameter analysis; payload schema.
- UX discovery interview; design prompts.
- **Artboards A1–A7.**

### 16.2 Remaining (in priority order)
1. Fix-pass prompt for text wrapping, overlaps and the clipped footer (§19.1).
2. A8 component sheet, A9 calibration, A10 acknowledged/Ward, A11 sign in, A12 unit overview, A13 lock.
3. Clickable prototype (Prompt B).
4. Live simulation (Prompt C).
5. **Science track:**
   - load datasets; features; heads A/B with leave-one-subject-out;
   - leakage probe and ablations;
   - in-house study;
   - backend integration.
6. Wristband bring-up and firmware.
7. Slides: results, limitations, ethics.
8. Rehearsal ×3 + backup video.
9. **Brief deliverables checklist:**
   - README with install/run instructions;
   - technical doc;
   - architecture diagram;
   - dataset/method;
   - model description;
   - results.
10. [OPEN] A spreadsheet summarising the design decisions was requested earlier but never produced.

### 16.3 Suggested day plan [PLANNED]

| Day | Focus |
|---|---|
| Day 1 | Data pipeline + hardware bring-up + live simulation UI |
| Day 2 | Models (LOSO), in-house study, backend ↔ dashboard integration |
| Day 3 | Evaluation figures, slides, rehearsals, backup recordings |

- **Cut order when behind:** 1D-CNN → face module → conformal correction → BLE.
- **Never cut:**
  - leave-one-subject-out validation;
  - the confounder false-alarm metric;
  - replay mode;
  - the limitations slide.

---

## 17. Ethics, safety and honesty points

- Permanent disclaimer on every screen; model version and validated population visible.
- "Coverage not validated" badge whenever context is outside the calibration data.
- No video frames stored: face data stays numeric (blendshapes) and in-browser.
- Pseudonymised patient IDs (P-7F3A); consent forms kept offline.
- Login prototype: credentials are visual only — not checked, stored or sent.
- Recommended actions are assessments only.
- **Honest limitations for the pitch:**
  - experimental pain in healthy adults;
  - small in-house sample;
  - stress and pain not fully separable (cold pain is itself stressful);
  - the face channel is confounded by concentration;
  - clinical modifiers are unvalidated expert priors;
  - not a medical device.

---

## 18. Easily forgotten details

1. Keep the alert slot height reserved even when empty.
2. Interval band = grey, always (including HC: use a pattern, not yellow).
3. Show the age of every non-live value ("45 s ago"); hide it after 300 s.
4. "Agitation" (ICU) vs "Activity" (Ward) is the same attribution class with a different label.
5. MASKED (by clinical context) is visually distinct from REJECTED (by signal quality).
6. Driver arrows show the physiological *direction*; the bar shows the *contribution* to the pain score. These can differ (↓ pulse amplitude gives a positive contribution).
7. Upper-face-only PSPI-proxy because of endotracheal tubes.
8. EDA electrodes must sit above the lesion in SCI patients.
9. The demo director must be visually labelled as non-clinical.
10. Simulator fallback must be obvious ("Simulator" pill) — never silently showing fake data as live.
11. Every human action is audited (flags, mode, acknowledgements, CPOT, baseline, theme/lang, lock).
12. CPOT entries appear on the timeline as reference markers.
13. Pain-likely thresholds: CPOT > 2, BPS > 5.
14. Speech balanced across demo conditions; wristband on the non-iced hand.
15. Check hackathon rules on pre-written code.
16. Cite WESAD/PainMonit and list reused repositories and licences in the README.

---

## 19. Inconsistencies, gaps and unclear points [OPEN]

### 19.1 Visual/layout defects in existing artboards
- "ALGOS‑Δ" wordmark wraps onto two lines.
- Wrapping labels: "Audit trail", "Baseline: adaptive", "Possible unmanaged pain", "(1 min 12 s)", "Assess CPOT / BPS", "80% interval 4.3 – 8.1", "Compare modes", "vs this patient's baseline", driver sublines, timeline legends, "Save assessment", "Total 4 / 8", "↑ Elevated", "Last valid 5.9 · 45 s ago".
- The "Sensor reliability" legend title overlaps "OK" (A1, A3, A6).
- "No drivers to show" overlaps its description (A3).
- The footer disclaimer and model version are clipped at the bottom of every artboard.

### 19.2 Content and logic inconsistencies
1. **Coverage badge:** A1 shows an ICU post-op patient *without* "Coverage not validated", but the validated population is healthy adults, so every ICU patient is outside it. A4 shows the badge. Decide: show it always for clinical patients, or define what "validated" means.
2. **CPOT values:** A5 records CPOT total **4** at 14:33, while A3's timeline shows "CPOT **5** · 14:33:40".
3. **Baseline timing:** the audit trail shows "Baseline marked 13:58:10" *before* "CPOT recorded 13:58:30 (total 1/8)". The spec says baseline is marked after a CPOT = 0 assessment.
4. **Arousal labels:** A4 uses "↑ Elevated", while the schema defines LOW | MODERATE | HIGH.
5. **Driver semantics:** the right card is titled "What is driving the arousal?" (attribution), while "Top drivers" shows contributions to the pain score. In A2 (stress), the drivers explain arousal but their contributions to pain are tiny. Decide whether drivers explain the *pain score* (Head A) or the *attribution* (Head B); the science spec says SHAP on Head B.
6. **Red rule:** the original rule was "red only in the alert banner". In practice red also appears on timeline alert triangles and is planned for the Unit overview alert badge. Recommend restating it as "red = alert semantics only".
7. **Schema:** the MASKED channel state and the "derived signal" marker exist in the UI but not in the schema (`channels[*].state` lacks MASKED; there is no derived-signal channel).
8. **Header:** the "Assessment unavailable" pill appears in A3 but is not defined in the header spec.
9. **Abstention card:** it doesn't show the most recent manual assessment, although a CPOT 5 was recorded minutes earlier on the A3 timeline.
10. **Calibration length:** 90 s (UI) vs 90–120 s (science spec).

### 19.3 Gaps (not designed or not specified)
- **Timeline** and **Assessments** nav tabs exist but have no screens.
- **Add-context popover**, Settings sheet, help popover and toast are not designed.
- **BPS tab** of the dialog is not designed; the FR language variant is not designed.
- **Tool-rail behaviour** (Front/back, Zoom, toggles) is not specified.
- **Mobile/tablet:** an early architecture note said the dashboard would be "responsive, opens on phone" (for the mobile bonus). The UI interview then chose laptop + projector only. No mobile view exists.
- **Live mode:** no "Live" (non-simulator) state artboard.
- **Ward-mode** screen not yet produced (A10 planned).
- **Multi-alert** and **alert-while-locked** behaviour is undefined.

---

## 20. Recommendations [SUGGESTED — not agreed requirements]

**UX:**
1. **Show the last clinician assessment in the hero** ("Last CPOT 1 · 34 min ago"). This makes estimate vs. reference visible at a glance and fixes gap 19.2-9.
2. **Disagreement cue:** when a fresh CPOT/BPS and the estimate disagree strongly, show a neutral "Estimate and clinical assessment disagree — clinician assessment prevails" note, and log it. This is valuable data for validation.
3. **"Baseline quality" indicator** (good / provisional) for patients who were not calm during calibration; allow "baseline after analgesia".
4. **Live-mode safeguard:** in a non-demo deployment, disable automatic simulator fallback; show "Connection lost — data paused" instead. Keep the fallback only in demo mode, with a persistent "SIMULATED DATA" watermark.
5. **Lightweight tablet/phone view** (single column: hero, attribution, alert, CPOT button) for the mobile-app bonus, at low cost.
6. **Auto night theme** by time of day, with manual override.
7. **Timeline tab** = the full-screen timeline with 30 min – 24 h ranges for shift review (usage priority #4). **Assessments tab** = list of CPOT/BPS entries vs. estimates.

**Science and pitch:**

8. **"Model card" popover** from the footer: training data, validation results, known limitations, version. This strongly supports the "réalisme" criterion.
9. **SPI-like comparator on the results slide:** show the confounder false-alarm rate for SPI-like vs. naive arousal vs. ALGOS‑Δ.
10. **Logging of ignored alerts** (time-to-acknowledge) as a future clinical-usability metric.

**Engineering:**

11. Add MASKED and DERIVED to the payload schema; add an `alert.id` and `alert.ack` object; add `reference.last_bps`.
12. Single source of truth for strings and thresholds (config file shared by backend and frontend).

---

## 21. Glossary

| Term | Meaning |
|---|---|
| Arousal index | Model-free z-score of autonomic activation vs. the personal baseline |
| Attribution | Probabilities that the arousal is due to pain / stress / activity-agitation / rest / unexplained |
| BPS | Behavioral Pain Scale (3–12), ICU, intubated patients |
| CoVAS | Computerised visual analogue scale (continuous 0–100 rating) |
| CPOT | Critical-Care Pain Observation Tool (0–8) |
| Conformal (Mondrian) interval | Prediction interval with empirical coverage, calibrated per stratum |
| Δ-feature | Feature expressed as a change from the personal baseline (Δ, z, Δ%) |
| EDA / SCL / SCR | Electrodermal activity; skin-conductance level (tonic); skin-conductance response (phasic) |
| ENMO | Euclidean norm minus one (dynamic acceleration) |
| LOSO | Leave-one-subject-out cross-validation |
| NMB | Neuromuscular blockade |
| PSPI | Prkachin–Solomon Pain Intensity (facial-action-unit pain metric) |
| RASS / CAM-ICU | Sedation scale / delirium assessment |
| r_c | Channel reliability = SQI × clinical modifiers |
| SQI | Signal quality index |
| SPI | Surgical Pleth Index (PPG-based nociception index) |

---

## Appendix A — Resources
- **Datasets:**
  - WESAD: https://www.eti.uni-siegen.de/ubicomp/home/datasets/icmi18/ and https://archive.ics.uci.edu/dataset/465/wesad+wearable+stress+and+affect+detection
  - PPG-DaLiA: https://archive.ics.uci.edu/dataset/495/ppg+dalia
  - PainMonit: https://doi.org/10.6084/m9.figshare.26965159
- **Repositories:**
  - pain data and benchmarks: gouverneurp/PMD, gouverneurp/XAIinPainResearch, philippwerner/pain-database-list, zhenyuanlu/awesome-pain-intensity-classification-papers;
  - signal processing: neuropsychology/NeuroKit, im-ethz/flirt, lciti/cvxEDA;
  - modelling: microsoft/LightGBM, scikit-learn-contrib/MAPIE, shap/shap;
  - hardware: sparkfun/SparkFun_MAX3010x_Sensor_Library, adafruit/Adafruit_ADS1X15;
  - face and dashboard: google-ai-edge/mediapipe-samples, tiangolo/fastapi, chartjs/Chart.js.

## Appendix B — Prompts produced during the project
1. **Full React dashboard prompt** (single-file artifact, WebSocket + simulator, themes, i18n, alert logic, acceptance checks).
2. **Claude Design three-part prompt** (design system + A1; A2–A4; A5–A8). → produced the existing A1–A7.
3. **Fix-pass prompt** (wrapping/overlap/footer) and **A8–A10 prompt**. [Not yet run]
4. **Prompt A** (A11 sign in, A12 unit overview, A13 session locked), **Prompt B** (clickable prototype links + director), **Prompt C** (live React simulation). [Not yet run]
