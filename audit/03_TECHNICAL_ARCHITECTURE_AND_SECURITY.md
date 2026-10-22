# 03 — Technical Architecture & Application Security Review

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior Software Engineering Lead & Application Security Reviewer  

---

## 1. Verified Technology Stack

| Layer | Technology | Verified Version | Purpose & Notes |
|---|---|---|---|
| **Frontend Framework** | **Next.js** (App Router) | `15.5.15` | Modern SSR/CSR hybrid, React 19 (`19.0.0`), Tailwind CSS 4 (`@tailwindcss/postcss: ^4`). |
| **Backend Framework** | **Laravel** | `11.31` | REST API layer, PHP `^8.2`, Eloquent ORM, Sanctum Auth (`^4.0`). |
| **Database** | **PostgreSQL** / **MySQL** | PostgreSQL in Prod (`pgsql`), MySQL/SQLite supported | Relational data persistence with 177 migrations. |
| **Cache & Queue** | **Redis** (`phpredis` / `predis`) | `predis/predis: ^2.3` | Session cache, queue worker backend, and rate limiting. |
| **WhatsApp Sidecar** | **Node.js** + **Baileys** | Node `20`, `@whiskeysockets/baileys` | WebSocket multi-device protocol bridge running as a separate service container. |
| **Mobile Client** | **React Native** + **Expo** | Expo SDK (`mobile/App.tsx`) | Mobile sales companion prototype in workspace. |
| **CI/CD & Hosting** | **GitHub Actions** + **K3s** | 3-node K3s cluster, self-hosted runner | Rolling deployment to namespace `leadsy-prod`. Cloudflare edge terminating TLS. |

---

## 2. High-Level Architecture & Component Separation

```
[ Clients: Web / Mobile ]
            │
            ▼
[ Cloudflare Edge Proxy (TLS termination) ]
            │
            ▼
[ Nginx Edge Load Balancer (NodePort) ]
            │
   ┌────────┴────────┐
   ▼                 ▼
[ Next.js Frontend ]  [ Laravel API Backend ] ◄────► [ Redis Cache / Queues ]
 (Port 3000)          (Port 3001)                     ▲
                      ├── Database (PostgreSQL)       │
                      ├── S3 / MinIO File Storage     │
                      └── WhatsApp Sidecar (Port 3002)┘
```

### Architectural Decisions & Artifacts:
1. **Multi-Tenancy Isolation Pattern:**  
   Implemented via `TenantScope` and `BelongsToTenant` trait using single-database, tenant-column-discriminator architecture (`tenant_id`). Tenant context is resolved automatically per request in `IdentifyTenant` middleware.
2. **AI Provider Abstraction Layer:**  
   `AiOrchestrationService` provides a unified OpenAI-compatible protocol router that interfaces with multiple LLM vendors (BytePlus ModelArk, OpenAI, Anthropic, DeepSeek) with database-driven token and cost tracking in `ai_requests`.
3. **Integration Hub Architecture:**  
   Credentials for third-party services (Lark, Documenso, Google Maps) are encrypted at rest using AES-GCM envelopes in `IntegrationCredentialCryptor` (`integration_credential_stores` table).

---

## 3. Security & Privacy Findings

### Finding SEC-001: Insecure Direct Object Reference (IDOR) on Quotations and Sales Orders
- **Classification:** **P1 — High Severity** (CWE-639: Authorization Bypass Through User-Controlled Key)
- **Observed Vulnerability:**
  In `backend/app/Http/Controllers/Api/LeadOrderToCashController.php`, several standalone endpoints look up financial records by ID without enforcing tenant isolation or verifying that the authenticated user's organization owns the record:
  ```php
  // LeadOrderToCashController.php:290-293
  public function showQuotation($id)
  {
      $quotation = LeadQuotation::with([...])->findOrFail($id);
      return response()->json(['data' => $quotation]);
  }

  // LeadOrderToCashController.php:296-298
  public function updateQuotation(Request $request, $id)
  {
      $quotation = LeadQuotation::findOrFail($id);
      ...
  }

  // LeadOrderToCashController.php:903
  public function showSalesOrder($id)
  {
      $order = LeadSalesOrder::findOrFail($id);
      ...
  }
  ```
- **Root Cause:**
  Unlike `Lead`, `User`, or `Product`, the `LeadQuotation` and `LeadSalesOrder` models **do not** use the `BelongsToTenant` trait. As a result, `TenantScope` is not applied automatically.
- **Realistic Impact:**
  An authenticated user from Tenant B could guess or enumerate integer IDs (`/api/quotations/14`) to view confidential commercial proposals, customer contacts, line-item pricing, discounts, and signatory names belonging to Tenant A.
- **Remediation:**
  1. Add `use \App\Models\Traits\BelongsToTenant;` to `LeadQuotation` and `LeadSalesOrder`.
  2. In `showQuotation` and `showSalesOrder`, scope lookups through the tenant context:  
     `$quotation = LeadQuotation::where('tenant_id', TenantContext::getTenantId())->findOrFail($id);`

---

### Finding SEC-002: Missing Rate Limiting on Authentication & Public Endpoints
- **Classification:** **P1 — High Severity** (CWE-307: Improper Restriction of Excessive Authentication Attempts)
- **Observed Vulnerability:**
  In `backend/routes/api.php:86-94`, public authentication endpoints are exposed without Laravel `throttle` middleware:
  ```php
  Route::prefix('auth')->group(function () {
      Route::post('login', [AuthController::class, 'login']);
      Route::post('send-otp', [AuthController::class, 'sendOtp']);
      Route::post('register', [AuthController::class, 'register']);
      Route::get('lark/tenants', [AuthController::class, 'getLarkTenants']);
      ...
  });
  ```
- **Root Cause:**
  Neither route-level `throttle:6,1` nor controller-level rate limiting is configured in `AuthController.php`.
- **Realistic Impact:**
  Vulnerable to automated brute-force credential stuffing, password spraying, and OTP SMS/email flooding, potentially incurring external email delivery costs or causing account takeover.
- **Remediation:**
  Apply standard rate limiters:
  `Route::prefix('auth')->middleware('throttle:10,1')->group(...)`

---

### Finding SEC-003: Accidental Exposure Risk from Inactive / Shared Integration Tokens
- **Classification:** **P2 — Medium Severity**
- **Observed Mechanism:**
  In `backend/app/Http/Controllers/Api/AuthController.php:113`, `generateApiToken` generates personal access tokens named `Integration_Token` for external automation. In `EnforceSessionTimeout.php:37`, tokens named `Integration_Token` are explicitly exempted from idle timeout:
  ```php
  if (! $accessToken || $accessToken->name === 'Integration_Token') {
      return $next($request);
  }
  ```
- **Realistic Impact:**
  Integration tokens remain valid indefinitely until manually revoked. If an administrator leaves the organization or credentials leak in client-side scripts, the token provides persistent API access without expiration.
- **Remediation:**
  Implement explicit token expiration dates (`expires_at`) and mandatory IP allowlisting for Integration Tokens.

---

### Finding SEC-004: Two-Factor Authentication (2FA) Implementation Analysis
- **Classification:** **Informational / Sound Practice**
- **Observed Architecture:**
  `TwoFactorAuthController.php` uses `pragmarx/google2fa-laravel` (`TOTP RFC 6238`). Two-factor secrets are encrypted in the database, and temporary session tokens (`createToken('2fa_token', ['2fa'])`) are properly restricted to the `2fa` ability until code verification succeeds.

---

## 4. Code Quality & Technical Debt Assessment

### 4.1 Strengths
- **Clean Model Separation:** Eloquent relationships (`HasMany`, `BelongsTo`, `MorphTo`) are comprehensively defined with return type declarations.
- **Dedicated Service Layer:** Business logic is segregated into discrete domain service classes (e.g. `LeadScoringService`, `ICPMatchingService`, `LarkBaseService`, `DigitalSignatureManager`).
- **Audit Logging Trait:** Critical operational mutations (stage transitions, logins, impersonation sessions) systematically create tamper-evident `AuditLog` records.

### 4.2 Technical Debt Areas
1. **Dual UI Code Trees:**  
   As established in `ARCH-001`, root `app/`, `components/`, and `lib/` remain in the repository. They are unused at runtime but cause developer confusion.
2. **Partial Model Tenancy:**  
   Only 8 out of 152 models currently use `BelongsToTenant`, leaving a fragile boundary where child entity security depends entirely on individual controller query composition.
3. **Queue Worker Heartbeat Failure:**  
   `backend/routes/console.php` contains evidence that the Redis queue worker daemon has stalled in production environments, requiring scheduled Artisan cron commands as a reliability fallback.

---

## 5. Non-Destructive Quality Assurance Checks Executed

| Command Executed | Directory | Exit Code | Result Summary | Conclusiveness |
|---|---|---|---|---|
| `npx tsc --noEmit` | `frontend/` | `0` | **Passed cleanly** (0 TypeScript errors). | Conclusive for frontend static types. |
| `php -l [modified files]` | `backend/` | `0` | **No syntax errors** across controllers, models, and routes. | Conclusive for PHP syntax. |
| `php artisan test --testsuite=Unit` | `backend/` | `0` | **16 tests passed** (52 assertions, SQLite in-memory). 10 PHP 8.5 deprecation notices noted. | Conclusive for backend unit logic. |
| `git status` | Root | `0` | **Clean tree** on `main` branch. | Conclusive for Git working state. |
