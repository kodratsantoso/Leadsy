import { apiFetch } from "../apiFetch";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
}

export type PsServiceCategory = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
};

export type PsComplexityLevel = {
  id: number;
  name: string;
  multiplier: string;
  description: string;
  is_active: boolean;
};

export type PsRateCard = {
  id: number;
  role_id: number;
  rate_per_manday: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
};

export type PsRole = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  rateCards?: PsRateCard[];
};

export type PsConfig = {
  categories: PsServiceCategory[];
  complexity_levels: PsComplexityLevel[];
  roles: PsRole[];
};

export type PsEstimationLine = {
  id?: number;
  estimation_id?: number;
  role_id: number;
  template_component_id?: number;
  task_name: string;
  description?: string;
  base_mandays: number;
  adjusted_mandays?: number;
  buffer_mandays?: number;
  manual_adjustment: number;
  final_mandays?: number;
  rate_snapshot?: number;
  estimated_fee?: number;
  sort_order: number;
  task_type?: "task" | "subtask";
  subtask_name?: string;
  deliverable?: string;
  acceptance_criteria?: string[];
  complexity_level_id?: number;
  complexity_multiplier_snapshot?: number;
  buffer_percentage_snapshot?: number;
  manual_adjustment_reason?: string;
  dependency_notes?: string[];
  risk_notes?: string[];
  is_ai_generated?: boolean;
  ai_confidence?: "high" | "medium" | "low";
  source_type?: string;
  source_reference_id?: string;
  status?: string;
  role?: PsRole;
  complexityLevel?: PsComplexityLevel;
  subtasks?: PsEstimationLine[];
};

export type PsEstimation = {
  id: number;
  estimation_number: string;
  lead_id?: number;
  lead?: any;
  service_category_id: number;
  template_id?: number;
  complexity_level_id?: number;
  title: string;
  complexity_multiplier: number;
  buffer_percentage: number;
  currency_code: string;
  total_base_mandays: number;
  total_adjusted_mandays: number;
  total_buffer_mandays: number;
  total_manual_adjustment_mandays: number;
  total_final_mandays: number;
  total_estimated_fee: number;
  assumptions?: string;
  out_of_scope?: string;
  dependencies?: string;
  risks?: string;
  internal_notes?: string;
  converted_quotation_id?: number;
  version_number?: number;
  parent_estimation_id?: number;
  status: "draft" | "pm_reviewed" | "pending_approval" | "approved" | "rejected" | "revision_required" | "converted_to_quotation" | "archived" | "document_generated" | "sent_for_signature" | "signed";
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  approved_at?: string;
  lines?: PsEstimationLine[];
};

export type PsEstimationTemplate = {
  id: number;
  service_category_id: number;
  name: string;
  description: string;
  is_active: boolean;
  serviceCategory?: PsServiceCategory;
  components?: any[];
};

export async function getPsConfig(): Promise<PsConfig> {
  const data = await fetchApi<PsConfig>("/professional-services/config");
  return data;
}

export async function getEstimationsByLead(leadId: number): Promise<PsEstimation[]> {
  const data = await fetchApi<PsEstimation[]>(`/professional-services/estimations?lead_id=${leadId}`);
  return data || [];
}

export async function getEstimation(id: number): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}`);
  return data;
}

export async function createEstimation(payload: Partial<PsEstimation> & { lines: Partial<PsEstimationLine>[] }): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>("/professional-services/estimations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateEstimation(id: number, payload: Partial<PsEstimation> & { lines: Partial<PsEstimationLine>[] }): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function duplicateEstimation(id: number): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/duplicate`, {
    method: "POST",
  });
  return data;
}

export async function reviewEstimation(id: number): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/review`, {
    method: "POST",
  });
  return data;
}

export async function approveEstimation(id: number): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/approve`, {
    method: "POST",
  });
  return data;
}

export async function quotationPreview(id: number, params: any): Promise<any> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  }
  const data = await fetchApi<any>(`/professional-services/estimations/${id}/quotation-preview?${query.toString()}`);
  return data;
}

export async function convertToQuotation(id: number, payload: any): Promise<{
  quotation_id: number;
  quotation_number: string;
  estimation_id: number;
  conversion_status: string;
}> {
  const data = await fetchApi<any>(`/professional-services/estimations/${id}/convert-to-quotation`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function getTemplates(): Promise<PsEstimationTemplate[]> {
  const data = await fetchApi<PsEstimationTemplate[]>("/professional-services/templates");
  return data;
}

export async function getTemplate(id: number): Promise<PsEstimationTemplate> {
  const data = await fetchApi<PsEstimationTemplate>(`/professional-services/templates/${id}`);
  return data;
}

export async function getEstimationTasks(id: number): Promise<PsEstimationLine[]> {
  const data = await fetchApi<PsEstimationLine[]>(`/professional-services/estimations/${id}/tasks`);
  return data;
}

export async function storeEstimationTask(id: number, payload: Partial<PsEstimationLine>): Promise<PsEstimationLine> {
  const data = await fetchApi<PsEstimationLine>(`/professional-services/estimations/${id}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

// ==========================================
// Phase 1 - Master Data Settings APIs
// ==========================================

export async function getPsServiceCategories(): Promise<PsServiceCategory[]> {
  const data = await fetchApi<PsServiceCategory[]>("/settings/professional-services/service-categories");
  return data;
}

export async function createPsServiceCategory(payload: { name: string; description?: string; is_active?: boolean }): Promise<PsServiceCategory> {
  const data = await fetchApi<PsServiceCategory>("/settings/professional-services/service-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updatePsServiceCategory(id: number, payload: { name: string; description?: string; is_active?: boolean }): Promise<PsServiceCategory> {
  const data = await fetchApi<PsServiceCategory>(`/settings/professional-services/service-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deletePsServiceCategory(id: number): Promise<void> {
  await fetchApi(`/settings/professional-services/service-categories/${id}`, { method: "DELETE" });
}

export async function getPsRoles(): Promise<PsRole[]> {
  const data = await fetchApi<PsRole[]>("/settings/professional-services/roles");
  return data;
}

export async function createPsRole(payload: { name: string; description?: string; is_active?: boolean; rate_per_manday?: number }): Promise<PsRole> {
  const data = await fetchApi<PsRole>("/settings/professional-services/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updatePsRole(id: number, payload: { name: string; description?: string; is_active?: boolean }): Promise<PsRole> {
  const data = await fetchApi<PsRole>(`/settings/professional-services/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deletePsRole(id: number): Promise<void> {
  await fetchApi(`/settings/professional-services/roles/${id}`, { method: "DELETE" });
}

export async function createPsRateCard(roleId: number, payload: { rate_per_manday: number; effective_from: string; effective_to?: string | null; is_active?: boolean }): Promise<PsRateCard> {
  const data = await fetchApi<PsRateCard>(`/settings/professional-services/roles/${roleId}/rate-cards`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updatePsRateCard(roleId: number, rateCardId: number, payload: { rate_per_manday: number; effective_from: string; effective_to?: string | null; is_active?: boolean }): Promise<PsRateCard> {
  const data = await fetchApi<PsRateCard>(`/settings/professional-services/roles/${roleId}/rate-cards/${rateCardId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function getPsComplexityLevels(): Promise<PsComplexityLevel[]> {
  const data = await fetchApi<PsComplexityLevel[]>("/settings/professional-services/complexity/levels");
  return data;
}

export async function createPsComplexityLevel(payload: { name: string; multiplier: number; description?: string; is_active?: boolean }): Promise<PsComplexityLevel> {
  const data = await fetchApi<PsComplexityLevel>("/settings/professional-services/complexity/levels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updatePsComplexityLevel(id: number, payload: { name: string; multiplier: number; description?: string; is_active?: boolean }): Promise<PsComplexityLevel> {
  const data = await fetchApi<PsComplexityLevel>(`/settings/professional-services/complexity/levels/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deletePsComplexityLevel(id: number): Promise<void> {
  await fetchApi(`/settings/professional-services/complexity/levels/${id}`, { method: "DELETE" });
}

export async function getPsSettingsTemplates(): Promise<PsEstimationTemplate[]> {
  const data = await fetchApi<PsEstimationTemplate[]>("/settings/professional-services/templates");
  return data;
}

export async function createPsSettingsTemplate(payload: { service_category_id: number; name: string; description?: string; is_active?: boolean }): Promise<PsEstimationTemplate> {
  const data = await fetchApi<PsEstimationTemplate>("/settings/professional-services/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updatePsSettingsTemplate(id: number, payload: { service_category_id: number; name: string; description?: string; is_active?: boolean }): Promise<PsEstimationTemplate> {
  const data = await fetchApi<PsEstimationTemplate>(`/settings/professional-services/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deletePsSettingsTemplate(id: number): Promise<void> {
  await fetchApi(`/settings/professional-services/templates/${id}`, { method: "DELETE" });
}

export async function updateEstimationTask(id: number, taskId: number, payload: Partial<PsEstimationLine>): Promise<PsEstimationLine> {
  const data = await fetchApi<PsEstimationLine>(`/professional-services/estimations/${id}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deleteEstimationTask(id: number, taskId: number): Promise<void> {
  await fetchApi(`/professional-services/estimations/${id}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function reorderEstimationTasks(id: number, tasks: { id: number; sort_order: number; parent_task_id: number | null }[]): Promise<void> {
  await fetchApi(`/professional-services/estimations/${id}/tasks/reorder`, {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
}

export async function recalculateEstimationTasks(id: number): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/tasks/recalculate`, {
    method: "POST",
  });
  return data;
}

export async function generateTaskBreakdown(id: number): Promise<any> {
  const data = await fetchApi<any>(`/professional-services/estimations/${id}/generate-task-breakdown`, {
    method: "POST",
  });
  return data;
}

export async function applyTaskBreakdown(id: number, task_breakdown: any[]): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/apply-task-breakdown`, {
    method: "POST",
    body: JSON.stringify({ task_breakdown }),
  });
  return data;
}

// --- Phase 5: Documents & Digital Signatures ---

export type PsDocumentSigner = {
  id: number;
  document_id: number;
  signer_type: "customer" | "internal";
  signer_name: string;
  signer_email: string;
  signer_title?: string;
  signer_company?: string;
  status: "pending" | "sent" | "viewed" | "signed" | "declined";
  signed_at?: string;
};

export type DigitalSignatureEnvelope = {
  id: number;
  document_id: number;
  provider_name: string;
  status: string;
  sent_at?: string;
  completed_at?: string;
};

export type PsDocument = {
  id: number;
  document_number: string;
  estimation_id: number;
  document_type: string;
  document_title: string;
  version_number: number;
  status: "draft_generated" | "sent_for_signature" | "signed" | "declined" | "expired" | "cancelled" | "archived" | "regenerated";
  file_name: string;
  file_url: string;
  generated_at?: string;
  sent_for_signature_at?: string;
  signed_at?: string;
  signers?: PsDocumentSigner[];
  signatureEnvelope?: DigitalSignatureEnvelope;
};

export type DigitalSignatureConnection = {
  id: number;
  provider_name: string;
  base_url: string;
  is_active: boolean;
};

export async function getEstimationDocuments(id: number): Promise<PsDocument[]> {
  const data = await fetchApi<PsDocument[]>(`/professional-services/estimations/${id}/documents`);
  return data;
}

export async function generateEstimationDocument(
  id: number, 
  payload: { document_type: string; include_commercial: boolean; include_task_breakdown: boolean; include_appendix: boolean }
): Promise<PsDocument> {
  const data = await fetchApi<PsDocument>(`/professional-services/estimations/${id}/documents/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function deleteEstimationDocument(id: number): Promise<void> {
  await fetchApi(`/professional-services/documents/${id}`, { method: "DELETE" });
}

export async function sendDocumentForSignature(
  id: number, 
  payload: { subject: string; message: string; signers: any[] }
): Promise<{ message: string; envelope: any; document: PsDocument }> {
  const data = await fetchApi<any>(`/professional-services/documents/${id}/send-signature`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function refreshDocumentSignatureStatus(id: number): Promise<{ envelope: any; document: PsDocument }> {
  const data = await fetchApi<any>(`/professional-services/documents/${id}/refresh-signature-status`, {
    method: "POST",
  });
  return data;
}

export async function getDigitalSignatureSettings(): Promise<DigitalSignatureConnection[]> {
  const data = await fetchApi<DigitalSignatureConnection[]>(`/settings/digital-signature`);
  return data;
}

export async function updateDigitalSignatureSetting(id: number, payload: any): Promise<DigitalSignatureConnection> {
  const data = await fetchApi<DigitalSignatureConnection>(`/settings/digital-signature/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function createDigitalSignatureSetting(payload: any): Promise<DigitalSignatureConnection> {
  const data = await fetchApi<DigitalSignatureConnection>(`/settings/digital-signature`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

// --- Phase 6: Approval & Governance ---

export type PsGovernanceRule = {
  id: number;
  rule_name: string;
  rule_type: string;
  threshold_value?: number;
  applies_to_service_category_id?: number;
  approver_role_id?: number;
  is_active: boolean;
  serviceCategory?: PsServiceCategory;
};

export type PsApprovalLog = {
  id: number;
  estimation_id: number;
  version_number?: number;
  action: string;
  from_status?: string;
  to_status?: string;
  actor_id?: number;
  comment?: string;
  reason?: string;
  actor?: any;
  created_at: string;
};

export type PsEstimationVersion = {
  id: number;
  estimation_id: number;
  version_number: number;
  version_label?: string;
  change_reason?: string;
  created_at: string;
};

export type PsRevision = {
  id: number;
  original_estimation_id: number;
  revised_estimation_id: number;
  revision_number: number;
  revision_reason?: string;
  created_at: string;
  revisedEstimation?: PsEstimation;
};

export type PsBlocker = {
  type: string;
  message: string;
  overridable: boolean;
};

export async function submitEstimationApproval(id: number, comment?: string): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/submit-approval`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
  return data;
}

export async function rejectEstimation(id: number, reason: string): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function requestEstimationRevision(id: number, reason: string): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/request-revision`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function createEstimationRevision(id: number, reason: string): Promise<PsEstimation> {
  const data = await fetchApi<PsEstimation>(`/professional-services/estimations/${id}/create-revision`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function getEstimationBlockers(id: number): Promise<PsBlocker[]> {
  const data = await fetchApi<PsBlocker[]>(`/professional-services/estimations/${id}/blockers`);
  return data;
}

export async function getEstimationVersions(id: number): Promise<{ versions: PsEstimationVersion[], logs: PsApprovalLog[], revisions: PsRevision[] }> {
  const data = await fetchApi<any>(`/professional-services/estimations/${id}/versions`);
  return data;
}

export async function getGovernanceRules(): Promise<PsGovernanceRule[]> {
  const data = await fetchApi<PsGovernanceRule[]>(`/professional-services/governance-rules`);
  return data;
}

export async function storeGovernanceRule(payload: Partial<PsGovernanceRule>): Promise<PsGovernanceRule> {
  const data = await fetchApi<PsGovernanceRule>(`/professional-services/governance-rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateGovernanceRule(id: number, payload: Partial<PsGovernanceRule>): Promise<PsGovernanceRule> {
  const data = await fetchApi<PsGovernanceRule>(`/professional-services/governance-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

// --- Phase 7: Project Planning Lite ---

export type PsProjectTask = {
  id: number;
  project_plan_id: number;
  source_estimation_task_id?: number;
  parent_task_id?: number;
  task_type: "phase" | "task" | "subtask" | "milestone";
  task_name: string;
  description?: string;
  deliverable?: string;
  acceptance_criteria?: string[];
  assigned_role_id?: number;
  assigned_user_id?: number;
  estimated_mandays: number;
  planned_start_date?: string;
  planned_end_date?: string;
  duration_days?: number;
  dependency_notes?: string[];
  predecessor_task_id?: number;
  status: "Not Started" | "In Progress" | "Blocked" | "Done" | "Cancelled";
  priority: "Low" | "Medium" | "High" | "Critical";
  risk_notes?: string[];
  sort_order: number;
  assignedRole?: PsRole;
  assignedUser?: any;
  subtasks?: PsProjectTask[];
};

export type PsProjectMilestone = {
  id: number;
  project_plan_id: number;
  milestone_name: string;
  description?: string;
  planned_date?: string;
  owner_id?: number;
  status: "Not Started" | "In Progress" | "Achieved" | "Delayed" | "Cancelled";
  dependency_notes?: string;
  sort_order: number;
};

export type PsProjectResource = {
  id: number;
  project_plan_id: number;
  role_id: number;
  assigned_user_id?: number;
  estimated_mandays: number;
  planned_start_date?: string;
  planned_end_date?: string;
  allocation_percentage?: number;
  notes?: string;
  role?: PsRole;
  assignedUser?: any;
};

export type PsProjectDeliveryChecklist = {
  id: number;
  project_plan_id: number;
  checklist_type: "uat" | "training" | "handover" | "hypercare";
  planned_start_date?: string;
  planned_end_date?: string;
  owner_id?: number;
  scope_notes?: string;
  checklist_items: Array<{ label: string; completed: boolean }>;
  status: string;
  general_notes?: string;
};

export type PsProjectRisk = {
  id: number;
  project_plan_id: number;
  risk_title: string;
  risk_description?: string;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  mitigation_plan?: string;
  owner_id?: number;
  status: "Open" | "Monitoring" | "Mitigated" | "Closed";
};

export type PsProjectReadinessItem = {
  id: number;
  project_plan_id: number;
  item_name: string;
  is_required: boolean;
  is_completed: boolean;
  override_reason?: string;
  sort_order: number;
};

export type PsProjectPlan = {
  id: number;
  project_plan_number: string;
  estimation_id: number;
  lead_id?: number;
  quotation_id?: number;
  sales_order_id?: number;
  project_name: string;
  customer_name_snapshot?: string;
  project_status: "Draft Plan" | "Ready for Kickoff" | "Active" | "On Hold" | "Completed" | "Cancelled" | "Archived";
  project_start_date?: string;
  target_go_live_date?: string;
  target_completion_date?: string;
  estimated_duration_days?: number;
  total_estimated_mandays: number;
  service_category_id?: number;
  estimation_template_id?: number;
  complexity_level_id?: number;
  project_manager_id?: number;
  delivery_notes?: string;
  risk_summary?: string;
  created_at: string;
  updated_at: string;
  lead?: any;
  projectManager?: any;
  estimation?: PsEstimation;
  tasks?: PsProjectTask[];
  milestones?: PsProjectMilestone[];
  resources?: PsProjectResource[];
  deliveryChecklists?: PsProjectDeliveryChecklist[];
  risks?: PsProjectRisk[];
  readinessItems?: PsProjectReadinessItem[];
};

export async function getProjectPlans(leadId?: number): Promise<any> {
  const url = leadId ? `/professional-services/project-plans?lead_id=${leadId}` : `/professional-services/project-plans`;
  const data = await fetchApi<any>(url);
  return data;
}

export async function getProjectPlan(id: number): Promise<PsProjectPlan> {
  const data = await fetchApi<PsProjectPlan>(`/professional-services/project-plans/${id}`);
  return data;
}

export async function createProjectPlanFromEstimation(estimationId: number): Promise<PsProjectPlan> {
  const data = await fetchApi<PsProjectPlan>(`/professional-services/estimations/${estimationId}/create-project-plan`, {
    method: "POST"
  });
  return data;
}

export async function updateProjectPlan(id: number, payload: Partial<PsProjectPlan>): Promise<PsProjectPlan> {
  const data = await fetchApi<PsProjectPlan>(`/professional-services/project-plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return data;
}

export async function updateProjectPlanStatus(id: number, status: string): Promise<PsProjectPlan> {
  const data = await fetchApi<PsProjectPlan>(`/professional-services/project-plans/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });
  return data;
}

// ==========================================
// Phase 8: PSA Lite Types & Functions
// ==========================================

export type PsPsaSetting = {
  id?: number;
  hours_per_manday?: number;
  require_work_log_approval?: boolean;
  require_bast_before_project_close?: boolean;
  require_uat_signoff_before_bast?: boolean;
  require_handover_before_bast?: boolean;
  require_signed_sow_before_active?: boolean;
  require_sales_order_before_active?: boolean;
  actual_md_watch_threshold_percentage?: number;
  actual_md_at_risk_threshold_percentage?: number;
  actual_md_overrun_threshold_percentage?: number;
  blocked_task_alert_days?: number;
  pending_change_request_alert_days?: number;
  allow_timesheet_on_unassigned_task?: boolean;
  allow_work_log_after_project_closed?: boolean;
  require_reason_for_task_reopen?: boolean;
};

export type PsWorkLog = {
  id: number;
  project_plan_id: number;
  project_task_id?: number;
  user_id: number;
  role_id?: number;
  work_date: string;
  actual_mandays: number;
  work_hours?: number;
  work_description?: string;
  work_type: string;
  billable: boolean;
  approval_status: string;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
};

export type PsChangeRequest = {
  id: number;
  change_request_number: string;
  project_plan_id: number;
  title: string;
  description: string;
  reason?: string;
  impact_type: string;
  additional_mandays: number;
  additional_fee: number;
  timeline_impact_days: number;
  status: string;
  created_at: string;
};

export type PsBastDocument = {
  id: number;
  bast_number: string;
  project_plan_id: number;
  customer_name_snapshot?: string;
  project_name?: string;
  status: string;
  created_at: string;
};

export type PsProjectActualSummary = {
  id: number;
  project_plan_id: number;
  estimated_mandays: number;
  planned_mandays: number;
  submitted_actual_mandays: number;
  approved_actual_mandays: number;
  remaining_mandays: number;
  variance_percentage: number;
  burn_rate: number;
  overrun_status: string;
};

// API Functions

export async function getPsaDashboard(): Promise<any> {
  return await fetchApi<any>(`/professional-services/psa-dashboard`);
}

export async function getPsaSettings(): Promise<PsPsaSetting> {
  return await fetchApi<PsPsaSetting>(`/professional-services/settings/psa`);
}

export async function updatePsaSettings(payload: PsPsaSetting): Promise<PsPsaSetting> {
  return await fetchApi<PsPsaSetting>(`/professional-services/settings/psa`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function getWorkLogs(projectPlanId?: number): Promise<PsWorkLog[]> {
  const url = projectPlanId ? `/professional-services/work-logs?project_plan_id=${projectPlanId}` : `/professional-services/work-logs`;
  return await fetchApi<PsWorkLog[]>(url);
}

export async function createWorkLog(payload: Partial<PsWorkLog>): Promise<PsWorkLog> {
  return await fetchApi<PsWorkLog>(`/professional-services/work-logs`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function approveWorkLog(id: number): Promise<PsWorkLog> {
  return await fetchApi<PsWorkLog>(`/professional-services/work-logs/${id}/approve`, { method: "POST" });
}

export async function rejectWorkLog(id: number, reason: string): Promise<PsWorkLog> {
  return await fetchApi<PsWorkLog>(`/professional-services/work-logs/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function getChangeRequests(projectPlanId?: number): Promise<PsChangeRequest[]> {
  const url = projectPlanId ? `/professional-services/change-requests?project_plan_id=${projectPlanId}` : `/professional-services/change-requests`;
  return await fetchApi<PsChangeRequest[]>(url);
}

export async function createChangeRequest(payload: Partial<PsChangeRequest>): Promise<PsChangeRequest> {
  return await fetchApi<PsChangeRequest>(`/professional-services/change-requests`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function approveChangeRequest(id: number): Promise<PsChangeRequest> {
  return await fetchApi<PsChangeRequest>(`/professional-services/change-requests/${id}/approve`, { method: "POST" });
}

export async function rejectChangeRequest(id: number, reason: string): Promise<PsChangeRequest> {
  return await fetchApi<PsChangeRequest>(`/professional-services/change-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function getBastDocuments(projectPlanId?: number): Promise<PsBastDocument[]> {
  const url = projectPlanId ? `/professional-services/bast?project_plan_id=${projectPlanId}` : `/professional-services/bast`;
  return await fetchApi<PsBastDocument[]>(url);
}

export async function generateBastDocument(projectPlanId: number, payload: any): Promise<PsBastDocument> {
  return await fetchApi<PsBastDocument>(`/professional-services/project-plans/${projectPlanId}/generate-bast`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

