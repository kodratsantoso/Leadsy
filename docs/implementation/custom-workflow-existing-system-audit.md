# Custom Workflow Existing System Audit

## 3.1 Existing components found

| Required Capability    | Existing Component   | Actual File Path | Decision                 |
| ---------------------- | -------------------- | ---------------- | ------------------------ |
| Quotation model        | LeadQuotation        | `backend/app/Models/LeadQuotation.php` | Reuse |
| Quotation status       | quotation_status, approval_status | `backend/app/Models/LeadQuotation.php` | Reuse |
| Approval functionality | PsApprovalService, LeadOrderToCashController | `backend/app/Services/ProfessionalServices/PsApprovalService.php`, `backend/app/Http/Controllers/Api/LeadOrderToCashController.php` | Extend |
| Automation engine      | QualificationRuleEngineService, RevenueRuleEngineService | `backend/app/Services/Lead/QualificationRuleEngineService.php`, `backend/app/Services/Revenue/RevenueRuleEngineService.php` | Extend / Missing (No generic stateful workflow engine found) |
| User hierarchy         | User model (direct_manager_id, tenant_id, role_id) | `backend/app/Models/User.php` | Reuse |
| Notifications          | WhatsApp, Lark Integrations | `backend/app/Services/WhatsApp/`, `backend/app/Services/Lark/` | Reuse |
| Audit log              | AuditLog, AuditService, LeadActivity | `backend/app/Models/AuditLog.php`, `backend/app/Services/AuditService.php`, `backend/app/Models/LeadActivity.php` | Reuse |
| Queue or worker        | Laravel database queue | `backend/.env.example` (QUEUE_CONNECTION=database) | Reuse |
| Design system          | shadcn/ui, lucide-react, tailwind | `frontend/package.json` | Reuse |
| Diagram library        | N/A | N/A | Missing |

## 3.2 Current Quotation flow

Quotation creation
→ validation (`api/leads/{lead}/quotations` via `LeadOrderToCashController::storeQuotation`)
→ database persistence (saved to `lead_quotations` and `lead_quotation_items` via `LeadOrderToCashController`)
→ status update (`LeadOrderToCashController::updateQuotationStatus` / `confirmSalesOrder`)
→ document generation (`ProfessionalServiceDocumentService` or related)
→ send to customer (Handled via API or external email/WhatsApp integrations)
→ activity logging (`LeadActivity::create` and `AuditService::logCreated` in `LeadOrderToCashController`)

## 3.3 Gap analysis

| Capability      | Classification | Evidence                      | Minimum Change                |
| --------------- | -------------- | ----------------------------- | ----------------------------- |
| Approval status | Existing       | `approval_status` field found on `LeadQuotation` | Reuse |
| State machine   | Missing        | No generic workflow runtime found | Add generic runtime           |
| Notifications   | Reusable       | Existing Lark/WhatsApp services | Add workflow templates        |
| Diagram canvas  | Missing        | No graph library found in package.json | Add minimal supported library (`reactflow`) |
| Visual Rule Builder | Missing | Existing QualificationWorkflow has hardcoded DB structure | Add JSON serialized condition builder component |
| Audit Logging   | Reusable       | `AuditService` and `LeadActivity` exist | Create specific workflow events |
| Tenant Isolation | Reusable | `tenant_id` on User, roles | Ensure all new models include `tenant_id` |

## 3.4 Proposed change classification

*   **REUSE WITHOUT CHANGE**: User hierarchy, Notifications, Audit log, Queue worker, Design system, Quotation model fields.
*   **EXTEND EXISTING**: Quotation controller (to trigger workflow submission), Activity timeline (to show workflow history).
*   **ADD NEW**: Custom workflow definition models, workflow instance models, workflow runtime engine service, visual diagram library (`reactflow` or similar), visual condition builder UI.
*   **DO NOT CHANGE**: Existing hardcoded workflows (`QualificationWorkflow`) should remain intact to avoid regressions.
*   **FUTURE PHASE**: Cross-tenant workflows, custom JS/SQL execution, workflow-to-workflow calls.
