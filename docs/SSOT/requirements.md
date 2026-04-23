# Lead Qualification & Eligibility System Requirements

## Document Control
- SSOT owner: Product + Engineering
- Version: 2026-04-18
- Status: Approved foundation
- Scope: Pre-CRM revenue intelligence and lead qualification layer

## Product Definition
This product is a lead qualification engine and revenue intelligence layer that sits before CRM and sales pipeline execution.

Target architecture position:

`Lead Sources -> Qualification Engine -> CRM -> Sales Pipeline`

This repository currently contains adjacent modules such as map discovery, funnel management, WhatsApp operations, and revenue intelligence. For governance purposes, the qualification capability defined here is the gatekeeper layer that determines whether a lead is fit to progress downstream.

## Business Objective
The system must:
- capture inbound and discovered leads
- evaluate each lead against a configurable qualification framework
- assign an explainable score and classification
- surface risk flags and recommended next actions
- prevent weak or unclear leads from polluting CRM and pipeline

## Success Criteria
- Leads can be evaluated automatically in sub-second rule-based flow.
- Output is explainable enough for sales, revops, and management to trust.
- Configuration can evolve without rewriting the core scoring algorithm.
- Every qualification decision can be audited.
- Low-confidence or incomplete records are routed for review instead of silently accepted.

## Primary Users
- Sales development representative
- Account executive
- Revenue operations analyst
- Sales manager / approver
- Administrator / system owner

## Ideal Customer Profile
The initial ICP for this repository is defined as:
- B2B organizations or structured multi-site operators
- small, medium, and enterprise companies
- organizations with identifiable operational, sales, customer-experience, or automation pain points
- companies that can support commercial engagement inside the supported territory
- leads with enough evidence to explain why the solution is relevant

Non-ICP examples:
- consumer-only contacts
- businesses outside approved territory or service coverage
- records with no clear business problem and no commercial path
- organizations with explicit technical incompatibility

## Definition Of Eligible Lead
A lead is eligible when:
- it aligns to target firmographic profile
- it shows meaningful need relevance
- there is credible commercial readiness
- there is access to a stakeholder who can influence buying
- there is no hard-stop technical or policy violation
- the system can explain the score with concrete signals

## Qualification Dimensions
The initial enterprise framework uses five scoring dimensions:

1. Firmographic
- industry alignment
- company size fit
- territory fit

2. Need Relevance
- clarity of business problem
- pain intensity
- use-case fit

3. Budget & Commercial Readiness
- budget confidence
- buying timeline
- commercial urgency

4. Stakeholder Access
- decision-maker engagement
- stakeholder coverage
- contact quality

5. Technical Fit
- solution fit
- integration complexity
- required capability match

## Output Classification
- `eligible`: score >= 80 and no hard-stop rule triggered
- `potential`: score 60-79 and no hard-stop rule triggered
- `need_review`: score 40-59 or critical qualification data is missing
- `not_eligible`: score < 40 or any hard-stop rule triggered

## Explainability Requirements
Every evaluation result must return:
- `status`
- `score`
- `reasoning`
- `risk_flags`
- `recommendation`

Preferred extended output:
- per-dimension breakdown
- hard-stop details
- critical data gaps
- normalized evaluation snapshot
- policy version used for the decision

## Governance Requirements
- SSOT-first development: no behavior changes without doc alignment
- ADR required for material architecture decisions
- audit logging required for qualification actions, overrides, and workflow decisions
- override actions must require justification
- configuration changes must be traceable

## Current Repository Alignment
Already present in codebase:
- lead CRUD
- lead scoring and qualification primitives
- audit logs
- RBAC foundation
- dashboard and lead detail views
- revenue intelligence support modules

Gaps now addressed or formalized by this execution batch:
- enterprise SSOT pack
- explicit qualification policy contract
- rule-based explainable evaluation endpoint
- minimal qualification workspace UI

## Deferred Items
The following are part of the target architecture but not fully implemented in this batch:
- database-backed parameter management UI
- review/approval workflow persistence
- full multi-tenant isolation
- full override workflow with approvals
- E2E test automation
