# TEAM-STATUS — QA-validointiloop tick

**Päivämäärä:** 2026-09-20 (tick)  
**Lead:** Project Lead / Koordinaattori  
**Lähteet:** `TEAM-BOARD.md`, `TEAM-QA/*` (13), `TEAM-FIXES/*` (23)  
**Scope:** Sprint 1 quick wins + P1-mallipohja (Explore OUT OF SCOPE)

---

## Tick-yhteenveto

| Bucket | Määrä | Featuret |
|--------|-------|----------|
| **DONE** | 9/9 | S1.1–S1.6, P1.1–4, P1.5, S3.0 |
| **QA_REVIEW** | 0 | — |
| **NEEDS_FIX** | 0 | — |
| **IN_PROGRESS** | 0 | — |
| **BLOCKED** | 0 | — |

Sprint 1 + P1 soft-gate suljettu: W7 TechLead re-gate → **APPROVED**. Ei avoimia gateja board-scopeen.

---

## Status per worker / rooli

| ID | Rooli / Feature | Status | QA | TechLead | Huomio |
|----|-----------------|--------|-----|----------|--------|
| **W1** | S1.1 Post-gen action rail | **DONE** | PASS | — | `S1.1-postgen-actions-report.md` |
| **W2** | S1.2 Marketing presetit | **DONE** | PASS | APPROVED | `S1.2-marketing-presets-report.md` |
| **W3** | S1.3 Enhancer UX | **DONE** | PASS | APPROVED | `S1.3-enhancer-report.md` |
| **W4** | S1.4 Seed + S1.5 Badges | **DONE** | PASS | APPROVED | `W4-seed-badges-report.md` |
| **W5** | S1.6 Audio-nav | **DONE** | PASS | APPROVED | `W5-audio-nav-report.md` |
| **W6** | P1.1–4 Katalogi | **DONE** | PASS | APPROVED | `P1.1-4-models-catalog-report.md` |
| **W7** | P1.5 Family/mode picker | **DONE** | PASS | **APPROVED** | `TEAM-QA/W7-techlead-regate.md`; B1 CLOSED |
| **W8** | S3.0 Assets IndexedDB | **DONE** | PASS | APPROVED | `W8-assets-report.md` + re-audit; Assets-tab mountattu |
| **Lead** | Board / status / merge | idle | — | — | Sprint 1+P1 suljettu; ei NEEDS_FIX-jonoo |
| **TechLead** | Arch gate | idle | — | — | Kaikki gate-featuret APPROVED (W7 soft-gate suljettu) |
| **QA** | Validointiloop | idle | — | — | Ei QA_REVIEW-jonoa |

---

## QA_REVIEW / NEEDS_FIX -tarkistus

1. **QA_REVIEW:** ei yhtään featurea boardilla.  
2. **NEEDS_FIX:** ei yhtään.  
3. **PASS-raportit:** kaikki 9 featurea peitetty (`TEAM-QA/` + `qa-reaudit-iter1.md` → 9 PASS / 0 FAIL).  
4. **Soft-gate:** W7 TechLead → APPROVED (viimeinen Sprint1/P1 soft-gate).

### Soft (ei status-muutosta)

| Aihe | Owner | Tyyppi |
|------|-------|--------|
| ImageStudio `consumeSendToPayload` | W8 (soft) | “Send to Image” AssetsPanelista ei kuluta payloadia; Video/Enhance/LipSync OK |
| Live generate-smoke | Lead | Ei ajettu (ei API-avainta tässä ympäristössä) |

Vanha `W8-assets-report.md` WARN “AssetsPanel ei mountattu” on **vanhentunut** — `StandaloneShell` mounttaa Assets-tabin (`AssetsPanel`).

---

## TEAM-QA / TEAM-FIXES -inventaario (tick)

**TEAM-QA (13):** S1.1, S1.2, S1.3, S1.4, S1.5, S1.6, S3.0, P1.1-4, P1.5, W4-seed-badges, W5-audio-nav, W8-assets, **W7-techlead-regate**  

**TEAM-FIXES (23):** iter1 + done -parit (W1–W3, W7–W8), TechLead-muistiot (W3/W6/W7), W6-requestit, `qa-audit-sprint1.md`, `qa-reaudit-iter1.md`, `qa-w7-techlead-regate.md`, `QUEUE-W6.md`

---

## Seuraavat askeleet

1. Käyttäjä: commit kun valmis; optional live-smoke (T2V/I2V) API-avaimella.  
2. Soft follow-up (ei sprint-blocker): ImageStudio send-to consume — vain jos Lead avaa uuden ticketin.

---

*QA-validointiloop tick valmis. Ei committeja. Ei feature-koodia.*
