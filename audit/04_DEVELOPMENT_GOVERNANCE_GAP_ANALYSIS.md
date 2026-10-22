# 04 — Development Governance & Engineering Operations Gap Analysis

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Software Engineering Lead & Project Architect  

---

## 1. Existing Development Process & Controls

The repository contains strong, highly specific governance rules established across several key documents:
- `AGENTS.md` (Root repository rules, deployment contract, database persistence guards, mandatory pre-flight Git pull, and mandatory TypeScript check).
- `frontend/AGENTS.md` (Active UI source of truth, prohibited browser dialogs, design token reuse).
- `DESIGN_SYSTEM.md` (Frozen design system reference and OKLch token authority).
- `.github/workflows/ci.yml` (Automated backend PHP lint/tests, Next.js build, and K3s rollout pipeline).

### 1.1 Verified Strengths in Existing Governance
1. **Mandatory Pre-Flight Git Protocol:**  
   `AGENTS.md` strictly commands developers and AI agents to fetch and pull before modifying code, explicitly banning `git push --force` or destructive rebases on shared branches (`main`, `virtuenet`).
2. **Production Database & Volume Persistence Guard:**  
   Explicit operational ban on `migrate:fresh`, `db:wipe`, `docker compose down -v`, or running seeders that overwrite production accounts. All migrations must be backward-compatible and additive.
3. **Dual-Remote Git Release Hygiene:**  
   Every completed increment must be pushed to both configured remotes:
   - Primary: `origin` (`git@github.com:virtuenet-prasetia/leadsy.git`)
   - Backup: `leadsy-backup` (`https://github.com/kodratsantoso/Leadsy.git`)
4. **Mandatory Pre-Push Quality Gate:**  
   Mandatory TypeScript check (`cd frontend && npx tsc --noEmit`) must succeed with zero errors prior to any push.
5. **AI Coding Instruction Infrastructure:**  
   The project has established custom AI skills in `.agents/skills/` (`backend-engineer`, `frontend-engineer`, `db-persistence-guard`, `ui-ux-designer`, `ui-ux-promax`, `qa-e2e-tester`, `fullstack-orchestrator`), ensuring AI pair programmers adhere to repository patterns.

---

## 2. Governance Gaps & Missing Practices

| Governance Area | Current State | Identified Gap | Severity |
|---|---|---|---|
| **Branching Strategy** | Direct commits and pushes on `main` branch. | Features and fixes are committed directly to `main`, bypassing peer review pull requests and staging pre-verification. Gated by CI, but lacks formal review approvals. | **P2 (Med)** |
| **Requirements & PRD Traceability** | High-level `BRD` and historical specs in `docs/` and `specs/`. | Detailed acceptance criteria (Given/When/Then) are not systematically tracked per ticket; features are added via conversational requests without formal Jira/Linear issue links. | **P2 (Med)** |
| **Definition of Ready (DoR)** | Informal / Implicit. | No formal checklist exists to verify whether API contracts, data schemas, and edge case designs are defined before frontend development starts. | **P3 (Low)** |
| **Definition of Done (DoD)** | Partially formalized in `AGENTS.md`. | Covers TypeScript and documentation, but lacks requirements for automated integration test coverage or cross-browser manual QA sign-off. | **P2 (Med)** |
| **Release Versioning Automation** | Manual version bumping in `version.json`, `backend/config/version.php`, and `README.md`. | Version bumping is performed manually by developers/agents, creating potential for minor version desynchronization. | **P3 (Low)** |
| **Deprecated Code Removal Policy** | Legacy root directories (`app/`, `components/`, `lib/`) marked deprecated in `app/README.md`. | No scheduled decommissioning date or automated CI check preventing accidental edits to root directories. | **P2 (Med)** |

---

## 3. Discovered Governance Defect Findings

### Finding GOV-001: Absence of Protected Staging Environment
- **Severity:** **P2 (Medium)**
- **Evidence:**  
  In `AGENTS.md` (Deployment Contract section):
  > *"Triggers: push and pull_request on main and virtuenet run test-backend and test-frontend. The deploy job is gated to a push on main... a push to virtuenet never deploys, and there is no development namespace today. Treat that as a known gap."*
- **Impact:**  
  Developers cannot verify end-to-end multi-tenant workflows or heavy database operations in an isolated staging namespace before rolling changes directly into the production K3s namespace (`leadsy-prod`).
- **Recommendation:**  
  Provision a lightweight staging namespace (`leadsy-staging`) deployed automatically on push to branch `virtuenet`.

---

### Finding GOV-002: Incomplete Runtime Validation in Definition of Done
- **Severity:** **P2 (Medium)**
- **Evidence:**  
  Recent releases satisfied static typechecking (`npx tsc --noEmit`), but runtime errors occurred in production because of array unpacking mismatches (`Q.map is not a function`).
- **Impact:**  
  Type safety alone does not verify that runtime API response payloads match TypeScript interface assumptions.
- **Recommendation:**  
  Incorporate automated contract testing or Playwright browser smoke tests against the built Next.js bundle into the pre-deploy workflow.

---

## 4. Proportionate Governance Recommendations

For a team of this scale, heavy enterprise process overhead should be avoided. Instead, implement these 3 lightweight, high-leverage standards:

1. **Staging Verification Gate:** Activate automatic deployment of `virtuenet` branch to a staging URL (e.g. `staging.leadsy.tech`) before merging to `main`.
2. **Runtime Contract Guard (Zod / Defensive Parsing):** Mandate that frontend API calls either validate responses with lightweight schemas or apply defensive array/object guards.
3. **Repository Tree Hygiene CI Check:** Add a 1-line check in `.github/workflows/ci.yml` that fails if any PR modifies files inside root `app/`, `components/`, or `lib/`.
