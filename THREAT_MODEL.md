# Utsav – Threat Model

> **Standard**: STRIDE | **Last updated**: 2026-11-01 | **Reviewer**: Engineering Lead

---

## 1. Assets

| Asset | Sensitivity | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Critical | Stored only in `.env` (git-ignored). Never logged. |
| User event inputs (name, date, guests, budget) | Low-Medium | No PII beyond free-text name field |
| Exported Excel/PDF files | Medium | Contains full event plan; transmitted over HTTPS |
| Server process & Node environment | High | Compromise = full access to API key |

---

## 2. Trust Boundaries

```
[ Browser ] --HTTPS--? [ Express Server ] --HTTPS--? [ Gemini API ]
                              ¦
                    [ In-memory LRU cache ]
                              ¦
                    [ File system (static) ]
```

---

## 3. STRIDE Analysis

### S – Spoofing
| Threat | Control |
|---|---|
| Attacker impersonates API caller | No auth required (public planner); rate-limiting via `express-rate-limit` |
| Attacker forges Gemini responses | Zod schema validation on all AI outputs; malformed JSON discarded |

### T – Tampering
| Threat | Control |
|---|---|
| Request body manipulation | Zod schema + 20 KB body limit; strict type coercion |
| Prompt injection via user inputs | Inputs passed through `sanitizePromptInput()` in `guard.js`; inputs never directly interpolated into raw prompt strings |
| Excel formula injection (CWE-1236) | **`sanitizeCell()`** in `export.js` prefixes dangerous characters (`=`, `+`, `-`, `@`) with tab |

### R – Repudiation
| Threat | Control |
|---|---|
| No audit trail of plan requests | Structured JSON logging (`logger.js`) for every plan/export/error event |

### I – Information Disclosure
| Threat | Control |
|---|---|
| API key leakage in logs | Logger strips env vars; `aiConfigured` boolean only |
| Error messages exposing internals | `sendError()` returns generic codes, never stack traces |
| Directory traversal via static routes | Express `static()` restricts to declared root dirs only |
| CSP bypass | `helmet` sets strict `Content-Security-Policy`; no `unsafe-inline` |

### D – Denial of Service
| Threat | Control |
|---|---|
| Request flooding | `express-rate-limit`: 60 req/min per IP on all API routes |
| Large request body crashing parser | `express.json({ limit: '20kb' })` |
| Slow Gemini API hanging requests | 12 s `AbortController` timeout + 1 retry with back-off |
| Runaway stress-test simulations | `simulations` capped at 2000 in schema |

### E – Elevation of Privilege
| Threat | Control |
|---|---|
| Prototype pollution | `zod` parsing creates plain objects; no `__proto__` path accepted |
| Shell injection via export filenames | Filenames constructed from validated ISO date strings only |

---

## 4. Known Gaps / Accepted Risks

| Gap | Severity | Mitigation Plan |
|---|---|---|
| No authentication | Low (public tool) | Add OAuth if user accounts are introduced |
| No HTTPS enforcement in dev | Low | Handled by Vercel TLS in production |
| axe audit not run in CI (jsdom only) | Medium | Add Playwright + real browser axe run in next sprint |
| No input rate-limit per unique event name | Low | Monitor logs for abuse patterns |

---

## 5. Recommended Next Steps

1. Add `Referrer-Policy: no-referrer` and `Permissions-Policy` headers
2. Pin Gemini API model version to avoid breaking changes
3. Add SBOM (Software Bill of Materials) generation to CI
4. Introduce integration-test API key with restricted quota for CI
