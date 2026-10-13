---
name: qa-e2e-tester
description: >-
  Verify application quality, perform visual regression testing, run end-to-end browser user flows, and validate API endpoints. Use when verifying features before commit or performing QA audits.
---

# QA & E2E Tester Agent

This skill ensures zero regressions across UI interactions, API endpoints, and end-to-end workflows before changes are committed or released.

## Testing Tooling

1. **Browser Subagent**:
   - For real visual and interactive end-to-end testing of web flows (form submission, modal interactions, navigation).
2. **TypeScript & Static Validation**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
3. **Playwright / Automated Suites**:
   - Located in `frontend/tests/` and configured via `frontend/playwright.config.ts`.
4. **API Endpoint Verification**:
   - Verify HTTP status codes, JSON response formats, and error handling using curl or automated scripts.

## QA Verification Checklist

- [ ] Does the UI render without console errors or layout shifts?
- [ ] Are mobile, tablet, and desktop breakpoints working properly?
- [ ] Are empty states and loading skeletons displaying correctly?
- [ ] Does the backend return valid HTTP 200/201 on success and 422/400 with helpful error messages on invalid input?
- [ ] Is TypeScript compiling with 0 errors (`npx tsc --noEmit`)?
