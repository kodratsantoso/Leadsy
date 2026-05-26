# Leadsy Long-Term Product Plan: Beyond ShareCRM

> Status: strategic roadmap  
> Last updated: 2026-05-26  
> Purpose: guide major product planning so Leadsy evolves from sales intelligence into an AI-first revenue operating system.

## 1. Strategic Positioning

ShareCRM is positioned as an enterprise CRM suite covering marketing, sales, service, partner management, BI, PaaS customization, and AI-assisted sales workflows.

Leadsy should not compete as a generic CRM clone. The stronger path is to become an **AI-first, mobile-first, field-sales-first revenue operating system** for Indonesia and SEA.

Leadsy's target advantage:

- Lead discovery and geo intelligence are native, not add-ons.
- WhatsApp, Lark, field visits, GPS evidence, territory, and sales hierarchy are first-class workflows.
- AI guides daily selling actions, not only reporting.
- Every dashboard metric can drill down to the exact working data.
- The system supports sales from lead discovery through revenue, service, renewal, and partner growth.

North Star:

> Sales users should know who to follow up today, why they matter, what to say, what product to offer, where to visit, what risk exists, and what action will move revenue forward.

## 2. Baseline Gap Summary

Leadsy already has strong foundations:

- Lead management, scoring, qualification, duplicate detection, and funnel movement.
- Maps and territory discovery with geo product fit.
- BANTC intelligence, transcripts, product matching, and AI analysis.
- WhatsApp integration and Lark SSO/Base two-way sync.
- Dashboard funnel, source/channel, achievement, and popup drilldowns.
- Mobile field sales MVP with lead inbox, sales visit, GPS clock-in/out, photo evidence, client signature, and risk signals.
- User roles, manager hierarchy, target revenue, and audit logging.

Main gaps against ShareCRM-style enterprise CRM:

- Marketing automation and campaign ROI.
- Formal Account, Contact, and Opportunity objects.
- Lead pool, weighted assignment, SLA, and recycle rules.
- CPQ, quotation, order, contract, invoice, payment, and receivables.
- Service ticketing, service visit, SLA, and post-sales lifecycle.
- Partner/PRM portal and channel sales workflows.
- Self-service BI/report/dashboard builder.
- Low-code custom fields, custom objects, custom layouts, and workflow builder.
- Enterprise governance: field-level permission, record sharing, deeper audit, integration hub.
- Predictive revenue AI and autonomous CRM assistance.

## 3. Product Horizons

| Horizon | Timeline | Focus | Outcome |
|---|---:|---|---|
| H1 | 0-3 months | Sales execution foundation | Leadsy becomes strong for daily sales operations. |
| H2 | 3-6 months | Account, opportunity, workflow, AI copilot | Leadsy becomes a real CRM and starts exceeding common SFA tools. |
| H3 | 6-12 months | CPQ, marketing, service, BI | Leadsy becomes end-to-end revenue management. |
| H4 | 12-18 months | PRM, low-code, enterprise governance | Leadsy becomes configurable enterprise platform. |
| H5 | 18-24 months | Predictive AI revenue OS | Leadsy becomes a decision engine, not only a data system. |

## 4. Version Roadmap

| Version | Theme | Major Capabilities |
|---|---|---|
| v1.2 | Sales Execution Pro | Lead pool, assignment automation, follow-up center, mobile visit review, visit policy settings. |
| v1.3 | Account & Opportunity CRM | Account 360, Contact roles, Opportunity object, lead conversion, forecast basics. |
| v1.4 | Workflow Automation | Trigger-condition-action builder, approvals, tasks, notification center. |
| v1.5 | AI Sales Copilot | Daily briefing, conversation assistant, deal coach, data quality agent. |
| v1.6 | CPQ Lite | Price list, quote line items, discount approval, PDF quote, quote acceptance. |
| v1.7 | Marketing Automation | Campaigns, audience segmentation, web/QR forms, nurturing, ROI tracking. |
| v1.8 | Service & Success | Service tickets, service visits, onboarding, renewal, customer health. |
| v1.9 | BI Builder | Report builder, dashboard builder, shared dashboards, AI insight generation. |
| v2.0 | Partner CRM | Partner portal, lead registration, partner opportunity sharing, partner performance. |
| v2.1 | Low-Code Platform | Custom fields, layouts, objects, validation rules, formula fields. |
| v2.2 | Enterprise Governance | Advanced permissions, audit, data management, integration hub. |
| v3.0 | Predictive Revenue OS | Win prediction, churn/renewal prediction, coaching engine, autonomous CRM agent. |

## 5. Phase Plans

### Phase 1: Sales Execution Pro

Goal: make Leadsy excellent for sales teams' daily work.

Scope:

- Lead pool for unassigned leads.
- Sales claim/unclaim lead flow.
- Auto assignment by territory, workload, product fit, score, and source.
- Weighted assignment for fair distribution.
- SLA follow-up and overdue logic.
- Auto-recycle leads that are not followed up.
- Follow-up command center: today, overdue, hot, dormant, recently updated, nearby.
- Push notifications for lead assignment, follow-up, overdue, and clock-out reminder.
- Web admin visit evidence viewer.
- Visit policy settings: radius, mandatory photo, mandatory signature, strict camera mode.
- Visit map report and fake-location review queue.

Success metrics:

- Sales can work from one prioritized inbox.
- Managers can see visit evidence and overdue follow-up without manual filtering.
- Lead response SLA is visible and enforceable.

### Phase 2: Account & Opportunity CRM

Goal: move Leadsy from lead intelligence into formal CRM sales management.

Scope:

- Account/company master separate from Lead.
- Account hierarchy for parent, branch, store, or subsidiary.
- Contact master with role: decision maker, influencer, finance, technical, user.
- Account timeline with rollup from leads, opportunities, visits, and activities.
- Opportunity object with amount, probability, expected close date, stage, competitor, product lines, and owner.
- Lead conversion flow into Account, Contact, and Opportunity.
- Account/contact duplicate merge center.
- Forecast categories: pipeline, best case, commit, closed.
- Forecast by sales, team, product, territory, and period.

Success metrics:

- Closed Won is traceable from lead to account and opportunity.
- Managers can inspect forecast by period and team.
- Multi-opportunity accounts are supported cleanly.

### Phase 3: Workflow Automation

Goal: make Leadsy actively move work forward.

Scope:

- Workflow builder with trigger, condition, and action.
- Supported triggers: lead created, stage changed, visit completed, no activity, outcome recorded, follow-up overdue.
- Supported actions: assign owner, notify, create task, change stage, send WhatsApp/email, push to Lark Base.
- Approval workflow for discount, reassignment, quote, visit exception, and fake-location review.
- Task object with owner, due date, priority, related record, and recurring task.
- Notification center for in-app, mobile push, email, WhatsApp, and Lark.

Success metrics:

- Common admin/sales operations can be automated without code.
- Overdue and exception handling becomes systematic.

### Phase 4: AI Sales Copilot

Goal: make AI the daily working layer.

Scope:

- AI daily briefing for each sales user.
- Next best action recommendations.
- Suggested WhatsApp/email follow-up text.
- AI conversation assistant for WhatsApp, transcript, and meeting notes.
- BANTC extraction and CRM field update suggestions.
- AI deal coach: risk, missing stakeholder, competitor risk, suggested recovery action.
- AI territory intelligence and route recommendations.
- AI data quality agent for duplicates, stale leads, missing data, and inconsistent stages.

Success metrics:

- Sales users receive action recommendations, not only analytics.
- Managers get coaching signals for each sales user and deal.

### Phase 5: CPQ Lite & Revenue Workflow

Goal: connect sales process to revenue commitment.

Scope:

- Advanced product catalog with price list, bundle, package, recurring pricing, regional pricing.
- Quote line items, discount, tax, terms, versioning, and status.
- Discount approval workflow.
- PDF quote generation.
- Send quote through WhatsApp/email.
- Client acceptance/signature.
- Convert quote to order.
- Contract attachments and status.
- Payment milestone and basic receivable tracking.
- Revenue views: booked, realized, recurring, upsell, cross-sell, renewal.

Success metrics:

- Teams can move from opportunity to quote without leaving Leadsy.
- Revenue numbers become auditable beyond manual outcome input.

### Phase 6: Marketing Automation

Goal: close the loop from acquisition to sales execution.

Scope:

- Campaign object with objective, owner, channel, cost, audience, and ROI.
- Audience segment builder.
- Dynamic segments based on source, industry, stage, score, activity, and product interest.
- Public lead forms, QR forms, event registration, and source attribution.
- WhatsApp/email drip nurturing.
- MQL to SQL rules.
- SDR queue and handoff rules.

Success metrics:

- Marketing source performance is measurable through revenue.
- Leads can enter Leadsy from forms/campaigns with attribution intact.

### Phase 7: Service & Customer Success

Goal: extend Leadsy after Closed Won.

Scope:

- Service ticket with SLA, priority, assignment, status, and escalation.
- Service visit with GPS, evidence, spare part/document evidence, and signature.
- Onboarding checklist after Closed Won.
- Sales-to-service handoff.
- Customer health score.
- Renewal reminders and expansion suggestions.
- Churn risk signals.

Success metrics:

- Customer lifecycle does not stop at Closed Won.
- Service evidence and renewal risk become visible in the same platform.

### Phase 8: BI & Revenue Analytics Platform

Goal: make analytics self-service and insight-driven.

Scope:

- Report builder for leads, accounts, opportunities, visits, activities, quotes, orders, and service tickets.
- Filters, groupings, metrics, and chart type selection.
- Dashboard builder with saved widgets.
- Dashboard sharing by role/team/user.
- Scheduled report delivery via email/Lark.
- AI insight generator for conversion drops, target gaps, productivity, territory performance, and product performance.

Success metrics:

- Business users can create useful reports without code.
- Dashboards answer "why" and "what to do next", not only "what happened".

### Phase 9: Partner CRM

Goal: support distributor, reseller, agent, and channel sales.

Scope:

- Partner portal.
- Partner lead registration.
- Conflict and duplicate partner lead detection.
- Partner opportunity sharing.
- Partner commission visibility.
- Partner collateral access.
- Partner performance dashboards.
- Partner price list and basic partner order workflow.

Success metrics:

- Channel leads can be controlled without spreadsheet handoffs.
- Partner performance is visible and auditable.

### Phase 10: Low-Code Platform

Goal: make Leadsy adaptable across industries.

Scope:

- Custom fields on core objects.
- Field types: text, number, select, multi-select, date, file, relation.
- Required, hidden, read-only, and conditional visibility rules.
- Custom layouts by role.
- Mobile layout configuration.
- Custom objects with generated CRUD, permissions, and relationships.
- Formula fields and validation rules.

Success metrics:

- Admins can adapt Leadsy without engineering for common business variations.
- Customization does not break design or governance.

### Phase 11: Enterprise Governance

Goal: make Leadsy enterprise-ready.

Scope:

- Object-level, field-level, and record-level permission.
- Territory-based visibility.
- Partner visibility boundaries.
- Full audit logs for data changes, exports, logins, API tokens, and admin actions.
- Import wizard.
- Dedup/merge center.
- Data quality dashboard.
- Backup/restore admin flow.
- Sandbox environment.
- Integration hub with REST connector, webhooks, Lark, WhatsApp provider abstraction, Google/Microsoft Calendar, ERP/accounting connectors.

Success metrics:

- Enterprise customers can govern data access and compliance.
- Integrations can be configured without custom code for every customer.

### Phase 12: Predictive Revenue OS

Goal: make Leadsy a predictive decision engine.

Scope:

- Predict win probability.
- Predict close date.
- Predict deal amount.
- Predict churn/renewal.
- Predict upsell candidate.
- Sales behavior coaching.
- Top-performer pattern comparison.
- Autonomous CRM agent that drafts summaries, suggests stage movement, drafts follow-up, and proposes field updates for user confirmation.
- Strategic AI command for manager questions:
  - Why are we missing target this month?
  - Which territory needs more sales coverage?
  - Which product should be pushed this week?
  - Which leads are most likely to close in the next 14 days?

Success metrics:

- Managers use Leadsy for decision-making, not only reporting.
- AI recommendations improve close rate, response time, and forecast accuracy.

## 6. Execution Principles

- Build from sales execution outward: lead, account, opportunity, quote, order, service, partner.
- Keep dashboard drilldowns connected to real filtered records.
- Treat mobile as a primary product, not a companion afterthought.
- Make AI explainable and approval-based for critical changes.
- Prefer configurable workflows before customer-specific hardcoding.
- Preserve strong audit trails for assignment, stage movement, visit evidence, revenue, and AI-suggested updates.
- Keep ShareCRM parity as a reference, but prioritize Leadsy differentiation: AI, field sales, WhatsApp, Lark, geo intelligence, and Indonesia-ready workflows.

## 7. Recommended Next Major Improvement

Recommended v1.2 scope:

1. Lead pool and assignment automation.
2. Follow-up command center.
3. Mobile push notifications.
4. Admin visit evidence review.
5. Visit policy settings.
6. Visit map report and fake-location review queue.

This scope builds directly on the current Leadsy foundation and creates the most immediate operational value before moving into Account and Opportunity CRM.

