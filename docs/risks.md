# Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| R1 | **External data sources** for company discovery not fixed in BRD §10 | High | ADR for provider (Google Places, licensed data, etc.); abstract `LeadDiscoveryProvider`; compliance review. |
| R2 | **WhatsApp** — personal QR vs Business API | Legal/ToS | BRD §3.9 + §11.10: prefer official API in production; adapter pattern. |
| R3 | **No PHP/Docker** on initial agent host | Blocks backend run | Docker Compose + `composer create-project` in container; document host prerequisites. |
| R4 | **AI cost / rate limits** | Cost, reliability | Model routing, fallback, quotas per BRD §11; log metadata only. |
| R5 | **PII in AI prompts** | Compliance | BRD §11.9 — masking pipeline before LLM calls. |
| R6 | **Scope size** | Schedule | Strict Phase 1 MVP from BRD §9; defer §7 “recommended” unless pulled into phase. |
