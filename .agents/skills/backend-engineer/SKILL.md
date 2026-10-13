---
name: backend-engineer
description: >-
  Build, extend, and debug Laravel backend APIs, controllers, services, middleware, form requests, and queue jobs. Use when creating new API endpoints, business logic, or backend services in backend/.
---

# Backend Engineer Agent

This skill guides backend engineering for the Leadsy platform inside `backend/` (Laravel 11).

## Scope & SSOT Boundaries

- **Working Directory**: `backend/`.
- **API Versioning / Prefix**: Standard API routes in `backend/routes/api.php`.
- **Controllers**: `backend/app/Http/Controllers/Api/`.
- **Models**: `backend/app/Models/`.

## Architecture & Conventions

1. **Form Requests & Validation**:
   - Always validate incoming inputs using dedicated `FormRequest` classes or `$request->validate([...])`.
   - Sanitize phone numbers (especially WhatsApp formatting: E.164 without leading `+` or zeros).
2. **Consistent API Response Structure**:
   ```json
   {
     "success": true,
     "message": "Operasi berhasil",
     "data": { ... }
   }
   ```
   Or on error:
   ```json
   {
     "success": false,
     "message": "Pesan error deskriptif",
     "errors": { ... }
   }
   ```
3. **Audit Trail & Logging**:
   - All critical lead alterations or status transitions must log to audit tables or Laravel log channels (`Log::info()`, `Log::error()`).
4. **Security & Authorization**:
   - Apply proper Sanctum/Auth middleware on private routes.
   - Respect role-based access controls (Superadmin, Admin, Agent/Sales).

## Code Syntax Check

Before finishing backend edits, run:
```bash
php -l <modified_file_path>
```
