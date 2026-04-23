# ADR-0001: Preserve Laravel + Next.js Baseline While Evolving Enterprise Qualification Layer

## Status
Accepted

## Date
2026-04-18

## Context
The enterprise directive prefers:
- Next.js frontend
- NestJS backend
- PostgreSQL database

This repository already operates on:
- Next.js frontend
- Laravel backend
- PostgreSQL database

It also already contains real lead, funnel, audit, map discovery, and WhatsApp modules. Replatforming backend architecture immediately would increase delivery risk and stall qualification-layer improvements that can be delivered on the current stack.

## Decision
Keep the current Laravel + Next.js architecture as the implementation baseline for the enterprise qualification foundation.

Implement the new qualification layer as:
- SSOT-defined domain capability
- config-backed rule engine
- auditable API endpoints
- incremental schema extensions

## Consequences

### Positive
- faster delivery on the existing production codebase
- lower regression risk
- reuse of current auth, audit, RBAC, and lead data model
- clear path for phased enterprise hardening

### Negative
- backend stack diverges from the prompt’s NestJS preference
- some enterprise module boundaries remain evolutionary instead of greenfield-clean

## Follow-Up
- revisit backend platform choice only if there is a clear scaling, team, or ecosystem need
- if replatforming is considered later, produce a migration ADR and compatibility plan first
