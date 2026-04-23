# Governance

## Governance Goals
- preserve SSOT discipline
- ensure explainable qualification decisions
- make overrides reviewable
- keep configuration and architecture changes traceable

## Required Controls
- authentication required for qualification APIs
- RBAC enforced for mutation endpoints
- audit logs for create, update, qualify, override, and workflow actions
- ADR required for material architecture shifts
- doc updates required for behavior or contract changes

## Override Policy
Future-state override flow must require:
- actor identity
- previous decision
- new decision
- justification text
- timestamp
- audit trail entry

## Review Workflow
Recommended review triggers:
- `need_review` classification
- hard-stop override requests
- missing critical data above threshold
- manual exception handling

## Testing Policy
All qualification features must include:
- unit coverage for scoring rules
- API coverage for evaluation contract
- regression coverage for hard-stop and missing-data scenarios

## Release Discipline
- trunk-based development
- conventional commits
- squash merge
- document-first changes for system behavior

## Current Decision Log
- This repository remains on Laravel + Next.js for the current execution horizon.
- Qualification policy is config-backed in the first enterprise implementation.
- Database-backed parameter administration is the next governance/persistence milestone.
