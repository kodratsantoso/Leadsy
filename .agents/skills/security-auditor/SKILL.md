---
name: security-auditor
description: >-
  Audit codebase and infrastructure security against international standards (OWASP Top 10, OWASP API Security, OWASP LLM Top 10, ISO 27001, and UU PDP No. 27/2022). Use when reviewing security posture, identifying vulnerabilities, checking multi-tenant isolation, or performing defensive code hardening.
---

# Security Auditor Agent Skill

This skill provides comprehensive security auditing guidelines, checklists, and automated inspection patterns for the Leadsy Enterprise codebase. It benchmarks the application against international industry standards and regulatory compliance frameworks.

## 1. Compliance Standards Benchmarks

1. **OWASP Top 10 (Web Application Security)**
   - A01: Broken Access Control (RBAC, IDOR, Global Tenant Scopes)
   - A02: Cryptographic Failures (AES-256-GCM for integration credentials, Bcrypt rounds >= 12)
   - A03: Injection (SQL injection via raw queries, Command injection, Cross-Site Scripting)
   - A04: Insecure Design (Business logic flaws, rate limiting, anti-automation)
   - A05: Security Misconfiguration (CORS, Debug flags, security headers, unauthenticated debug routes)
   - A06: Vulnerable and Outdated Components (Composer & NPM CVE advisories)
   - A07: Identification and Authentication Failures (Sanctum tokens, 2FA, session timeout, brute-force defense)
   - A08: Software and Data Integrity Failures (Signed webhooks, HMAC verification, BAST digital signatures)
   - A09: Security Logging and Monitoring (AuditService trails, immutable logs, no secret leakage)
   - A10: Server-Side Request Forgery - SSRF (Web research fetchers, webhook delivery URLs)

2. **OWASP API Security Top 10 (2023)**
   - API1: Broken Object Level Authorization (BOLA/IDOR on `Lead`, `Invoice`, `PsProject`)
   - API2: Broken Authentication (Token leaks, weak expiration)
   - API3: Broken Object Property Level Authorization (Mass assignment on `User`, `Role`, `Tenant`)
   - API4: Unrestricted Resource Consumption (Rate limiting on login, OTP, OpenSearch, AI endpoints)
   - API5: Broken Function Level Authorization (BFLA - missing `permission:*` middleware)

3. **OWASP Top 10 for LLM Applications (AI Security)**
   - LLM01: Prompt Injection (Jailbreaking, system prompt overriding from user notes/transcripts)
   - LLM02: Sensitive Information Disclosure (PII Masking compliance with UU PDP)
   - LLM04: Model Denial of Service (Timeout thresholds, max token limits, request collision caching)
   - LLM06: Excessive Agency (Autonomous lead stage changes vs advisory recommendation)

4. **Indonesian Data Protection Law (UU No. 27/2022 - UU PDP)**
   - Anonymization and tokenization of personal identifiable data before cross-border transmission.
   - Right to erasure (Soft deletes + purge governance).
   - Audit trail of data access and mutations.

---

## 2. Security Audit Commands & Verification Tooling

### Static Application Security Testing (SAST):
```bash
# 1. Dependency vulnerability audit
composer audit
npm audit --prefix frontend

# 2. TypeScript compilation & strict typing
cd frontend && npx tsc --noEmit

# 3. PHP syntax check on modified files
php -l <path-to-file>

# 4. Git secrets & sensitive key scanning
git log -p -n 50 | grep -iE 'api[_-]?key|secret|password|bearer'
```

### Route & Middleware Hardening Checks:
Verify that all administrative and data-mutation routes in `backend/routes/api.php` enforce:
- `auth:sanctum` for authentication.
- `session.timeout` for inactive session revocation.
- `permission:<slug>` for role-based authorization.
- `throttle:<attempts>,<minutes>` on brute-force susceptible endpoints.

---

## 3. High-Priority Vulnerability Checklist for Leadsy

- [ ] **Multi-Tenant Isolation**: Does every customer-facing Eloquent query use `BelongsToTenant` / `TenantScope`?
- [ ] **Credential Protection**: Are third-party tokens (WhatsApp, Lark, S3, AI API keys) encrypted at rest using Laravel's `Crypt::encryptString`?
- [ ] **SSRF Mitigation**: Does the web crawler or webhook dispatcher validate and block internal IP addresses (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, `10.43.0.0/16`)?
- [ ] **No Secret Logging**: Are passwords, access tokens, and decrypted keys filtered out from Laravel logs (`config/logging.php`)?
- [ ] **PII Masking**: Does every AI prompt generation path route through `PiiMaskingService` before calling external LLMs?
