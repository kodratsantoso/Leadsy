# Qualification Framework

## Policy Version
- `enterprise-qualification-v1`

## Scoring Model
Total score: 100

### Dimension Weights
| Dimension | Weight |
| --- | ---: |
| Firmographic | 25 |
| Need Relevance | 25 |
| Budget & Commercial Readiness | 20 |
| Stakeholder Access | 15 |
| Technical Fit | 15 |

## Dimension Rules

### 1. Firmographic
Signals:
- target industry fit
- company size band
- territory fit

Default point allocation:
- industry fit: high `15`, medium `9`, unknown `4`, low `0`
- company size: enterprise `6`, medium `6`, small `5`, micro `2`, unknown `2`
- territory fit: yes `4`, unknown `2`, no `0`

### 2. Need Relevance
Signals:
- clear problem statement
- pain level
- use-case fit

Default point allocation:
- problem statement present `8`, absent `0`
- pain level: high `10`, medium `6`, low `2`, unknown `0`
- use-case fit: high `7`, medium `4`, low `0`, unknown `2`

### 3. Budget & Commercial Readiness
Signals:
- budget status
- timeline in months
- commercial urgency

Default point allocation:
- budget: confirmed `10`, range `6`, unknown `2`, unavailable `0`
- timeline: <=3 months `6`, <=6 months `4`, <=12 months `2`, unknown `1`, >12 months `0`
- urgency: high `4`, medium `2`, low `1`, unknown `0`

### 4. Stakeholder Access
Signals:
- decision-maker engaged
- stakeholder count
- named contact quality

Default point allocation:
- decision-maker engaged: yes `8`, unknown `2`, no `0`
- stakeholder count: >=2 `4`, 1 `2`, 0 `0`
- named contact / role quality: strong `3`, weak `1`, absent `0`

### 5. Technical Fit
Signals:
- technical fit rating
- integration complexity
- required capabilities clarity

Default point allocation:
- technical fit: high `9`, medium `5`, low `0`, unknown `2`
- integration complexity: low `4`, medium `2`, high `0`, unknown `1`
- capabilities defined: yes `2`, no `0`

## Hard-Stop Rules
Any triggered hard-stop forces `not_eligible` regardless of numeric score.

Initial hard-stop list:
- outside approved territory
- target industry fit is explicitly low
- budget explicitly unavailable
- technical fit explicitly low

## Need Review Rules
`need_review` is used when:
- score is between `40` and `59`, or
- at least `3` critical qualification fields are missing

Critical fields:
- `target_industry_fit`
- `problem_statement`
- `budget_status`
- `decision_maker_engaged`
- `technical_fit`

## Recommendations By Status
- `eligible`: push to CRM / active sales workflow
- `potential`: enrich and validate missing decision/commercial signals
- `need_review`: route to human reviewer for clarification
- `not_eligible`: do not push downstream; log disqualification rationale

## Explainability Contract
Each evaluation should provide:
- dimension-by-dimension score
- concise reasoning statements
- risk flags
- hard-stop indicators
- normalized snapshot of the evaluated input

## Current Prototype Decision
The first implementation uses a configuration-backed rule engine in Laravel. Parameter storage in database is defined in `database_schema.md` and remains the next persistence step.
