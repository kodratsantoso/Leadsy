-- Restore and map legacy `prasetialeadsmanagement` data into the current
-- `prasetialeadsgenerator` database.
--
-- Expected preconditions:
-- 1. The legacy schema dump has already been restored into `legacy_mgmt`.
-- 2. The current database already contains the latest application schema.

BEGIN;

-- Ensure minimum role set exists for imported users.
INSERT INTO roles (name, display_name, description, is_active, created_at, updated_at)
SELECT legacy.name,
       initcap(replace(legacy.name, '_', ' ')),
       'Imported from legacy management database',
       true,
       now(),
       now()
FROM legacy_mgmt.roles legacy
WHERE NOT EXISTS (
    SELECT 1 FROM roles existing_role WHERE existing_role.name = legacy.name
);

-- Ensure imported users exist in the current auth table.
INSERT INTO users (name, email, password, role_id, phone, is_active, tenant_id, created_at, updated_at)
SELECT legacy.full_name,
       legacy.email,
       CASE
           WHEN legacy.password_hash LIKE '$2b$%' THEN '$2y$' || substr(legacy.password_hash, 5)
           ELSE legacy.password_hash
       END,
       app_role.id,
       NULL,
       legacy.is_active,
       COALESCE(default_tenant.id, 1),
       legacy.created_at,
       legacy.updated_at
FROM legacy_mgmt.users legacy
LEFT JOIN roles app_role
  ON app_role.name = (
      SELECT lr.name
      FROM legacy_mgmt.roles lr
      WHERE lr.id = legacy.role_id
      LIMIT 1
  )
CROSS JOIN LATERAL (
    SELECT id FROM tenants ORDER BY id LIMIT 1
) default_tenant
WHERE NOT EXISTS (
    SELECT 1 FROM users existing_user WHERE existing_user.email = legacy.email
);

-- Bring legacy products into the new product catalog.
INSERT INTO products (
    name, category, description, target_industry, target_pain_points,
    target_buyer_persona, ideal_company_profile, status, created_by, created_at, updated_at
)
SELECT legacy.name,
       legacy.category,
       legacy.description,
       NULL,
       NULL,
       NULL,
       NULL,
       CASE WHEN legacy.is_active THEN 'active' ELSE 'inactive' END,
       importer.id,
       legacy.created_at,
       legacy.updated_at
FROM legacy_mgmt.products legacy
LEFT JOIN users importer ON importer.email = 'admin@prasetia.com'
WHERE NOT EXISTS (
    SELECT 1 FROM products existing_product WHERE existing_product.name = legacy.name
);

-- Import core lead rows.
WITH default_tenant AS (
    SELECT id FROM tenants ORDER BY id LIMIT 1
),
lead_payload AS (
    SELECT legacy.id AS legacy_lead_id,
           legacy.company_name,
           legacy.geography AS address,
           legacy.contact_phone AS phone,
           legacy.contact_email AS email,
           legacy.industry AS business_category,
           legacy.company_size AS company_size_estimate,
           CASE legacy.status::text
               WHEN 'ELIGIBLE' THEN 'eligible'
               WHEN 'POTENTIAL' THEN 'potential'
               WHEN 'NOT_ELIGIBLE' THEN 'not_eligible'
               ELSE 'pending'
           END AS qualification_status,
           legacy.notes AS ai_explanation,
           app_user.id AS created_by,
           dt.id AS tenant_id,
           legacy.created_at,
           legacy.updated_at
    FROM legacy_mgmt.leads legacy
    LEFT JOIN legacy_mgmt.users legacy_user ON legacy_user.id = legacy.created_by
    LEFT JOIN users app_user ON app_user.email = legacy_user.email
    CROSS JOIN default_tenant dt
)
INSERT INTO leads (
    company_name, address, phone, email, business_category,
    company_size_estimate, qualification_status, ai_explanation,
    duplicate_status, ai_mode, created_by, tenant_id, created_at, updated_at
)
SELECT payload.company_name,
       payload.address,
       payload.phone,
       payload.email,
       payload.business_category,
       payload.company_size_estimate,
       payload.qualification_status,
       payload.ai_explanation,
       'new',
       'manual',
       payload.created_by,
       payload.tenant_id,
       payload.created_at,
       payload.updated_at
FROM lead_payload payload
WHERE NOT EXISTS (
    SELECT 1
    FROM leads existing_lead
    WHERE existing_lead.company_name = payload.company_name
      AND COALESCE(existing_lead.email, '') = COALESCE(payload.email, '')
);

-- Import primary contacts from the old lead record.
INSERT INTO lead_contacts (
    lead_id, name, email, phone, confidence, do_not_contact,
    is_primary, source, confidence_score, created_at, updated_at
)
SELECT current_lead.id,
       legacy.contact_name,
       legacy.contact_email,
       legacy.contact_phone,
       'high',
       false,
       true,
       'other',
       90,
       legacy.created_at,
       legacy.updated_at
FROM legacy_mgmt.leads legacy
JOIN leads current_lead
  ON current_lead.company_name = legacy.company_name
 AND COALESCE(current_lead.email, '') = COALESCE(legacy.contact_email, '')
WHERE NOT EXISTS (
    SELECT 1
    FROM lead_contacts contact
    WHERE contact.lead_id = current_lead.id
      AND contact.name = legacy.contact_name
      AND COALESCE(contact.email, '') = COALESCE(legacy.contact_email, '')
);

-- Import lead source attribution.
INSERT INTO lead_sources (
    lead_id, source_type, source_ref, confidence, created_at, updated_at, tenant_id
)
SELECT current_lead.id,
       lower(replace(source.name, ' ', '_')),
       legacy.source_id,
       'medium',
       legacy.created_at,
       legacy.updated_at,
       current_lead.tenant_id
FROM legacy_mgmt.leads legacy
JOIN legacy_mgmt.lead_sources source ON source.id = legacy.source_id
JOIN leads current_lead
  ON current_lead.company_name = legacy.company_name
 AND COALESCE(current_lead.email, '') = COALESCE(legacy.contact_email, '')
WHERE NOT EXISTS (
    SELECT 1
    FROM lead_sources ls
    WHERE ls.lead_id = current_lead.id
      AND ls.source_ref = legacy.source_id
);

-- Import the latest evaluation into the new lead_scores table.
INSERT INTO lead_scores (
    lead_id, score, grade, score_breakdown, last_scored_at, created_at, updated_at, tenant_id
)
SELECT current_lead.id,
       ROUND(evaluation.total_score)::int,
       CASE
           WHEN evaluation.total_score >= 80 THEN 'Hot'
           WHEN evaluation.total_score >= 60 THEN 'Warm'
           ELSE 'Cold'
       END,
       evaluation.dimension_scores,
       evaluation.evaluated_at,
       evaluation.created_at,
       evaluation.created_at,
       current_lead.tenant_id
FROM legacy_mgmt.lead_evaluations evaluation
JOIN legacy_mgmt.leads legacy ON legacy.id = evaluation.lead_id
JOIN leads current_lead
  ON current_lead.company_name = legacy.company_name
 AND COALESCE(current_lead.email, '') = COALESCE(legacy.contact_email, '')
WHERE evaluation.is_latest = true
  AND NOT EXISTS (
      SELECT 1 FROM lead_scores current_score WHERE current_score.lead_id = current_lead.id
  );

-- Import the latest evaluation into the new lead_qualifications table.
INSERT INTO lead_qualifications (
    lead_id, qualified, business_type, company_size_band, qualification_reason,
    last_qualified_at, classification, score, dimension_breakdown, risk_flags,
    hard_stops, recommendation, evaluation_snapshot, created_at, updated_at, tenant_id
)
SELECT current_lead.id,
       CASE evaluation.status::text
           WHEN 'ELIGIBLE' THEN 'yes'
           WHEN 'POTENTIAL' THEN 'maybe'
           WHEN 'NOT_ELIGIBLE' THEN 'no'
           ELSE 'maybe'
       END,
       NULL,
       CASE
           WHEN legacy.company_size ILIKE '%1000%' OR legacy.company_size ILIKE '%enterprise%' THEN 'enterprise'
           WHEN legacy.company_size ILIKE '%250%' OR legacy.company_size ILIKE '%999%' THEN 'medium'
           WHEN legacy.company_size ILIKE '%50%' OR legacy.company_size ILIKE '%249%' THEN 'small'
           ELSE 'unknown'
       END,
       COALESCE(
           CASE
               WHEN jsonb_typeof(evaluation.reasoning) = 'array'
               THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(evaluation.reasoning)), '; ')
               ELSE evaluation.recommendation
           END,
           'Imported from legacy evaluation'
       ),
       evaluation.evaluated_at,
       CASE evaluation.status::text
           WHEN 'ELIGIBLE' THEN 'eligible'
           WHEN 'POTENTIAL' THEN 'potential'
           WHEN 'NOT_ELIGIBLE' THEN 'not_eligible'
           ELSE 'need_review'
       END,
       ROUND(evaluation.total_score)::int,
       evaluation.dimension_scores,
       evaluation.risk_flags,
       CASE WHEN evaluation.hard_stop_triggered THEN to_json(ARRAY[evaluation.hard_stop_rule]) ELSE '[]'::json END,
       evaluation.recommendation,
       json_build_object(
           'legacy_lead_id', legacy.id,
           'legacy_evaluation_id', evaluation.id,
           'legacy_status', evaluation.status,
           'legacy_source_schema', 'legacy_mgmt'
       ),
       evaluation.created_at,
       evaluation.created_at,
       current_lead.tenant_id
FROM legacy_mgmt.lead_evaluations evaluation
JOIN legacy_mgmt.leads legacy ON legacy.id = evaluation.lead_id
JOIN leads current_lead
  ON current_lead.company_name = legacy.company_name
 AND COALESCE(current_lead.email, '') = COALESCE(legacy.contact_email, '')
WHERE evaluation.is_latest = true
  AND NOT EXISTS (
      SELECT 1 FROM lead_qualifications current_qualification WHERE current_qualification.lead_id = current_lead.id
  );

-- Update leads with recommended product when available.
UPDATE leads current_lead
SET product_id = mapped_product.id
FROM legacy_mgmt.lead_evaluations evaluation
JOIN legacy_mgmt.leads legacy ON legacy.id = evaluation.lead_id
JOIN legacy_mgmt.products legacy_product ON legacy_product.id = evaluation.recommended_product_id
JOIN products mapped_product ON mapped_product.name = legacy_product.name
WHERE evaluation.is_latest = true
  AND current_lead.company_name = legacy.company_name
  AND COALESCE(current_lead.email, '') = COALESCE(legacy.contact_email, '')
  AND current_lead.product_id IS NULL;

-- Import lead activity history.
INSERT INTO lead_activities (
    lead_id, activity_type, description, activity_date,
    user_id, created_at, updated_at, tenant_id
)
SELECT current_lead.id,
       lower(legacy_activity.type::text),
       COALESCE(legacy_activity.title || E'\n' || legacy_activity.description, legacy_activity.title, legacy_activity.description),
       legacy_activity.created_at,
       app_user.id,
       legacy_activity.created_at,
       legacy_activity.created_at,
       current_lead.tenant_id
FROM legacy_mgmt.lead_activities legacy_activity
JOIN legacy_mgmt.leads legacy ON legacy.id = legacy_activity.lead_id
JOIN leads current_lead
  ON current_lead.company_name = legacy.company_name
 AND COALESCE(current_lead.email, '') = COALESCE(legacy.contact_email, '')
LEFT JOIN legacy_mgmt.users legacy_user ON legacy_user.id = legacy_activity.user_id
LEFT JOIN users app_user ON app_user.email = legacy_user.email
WHERE NOT EXISTS (
    SELECT 1
    FROM lead_activities existing_activity
    WHERE existing_activity.lead_id = current_lead.id
      AND existing_activity.activity_date = legacy_activity.created_at
      AND COALESCE(existing_activity.description, '') = COALESCE(COALESCE(legacy_activity.title || E'\n' || legacy_activity.description, legacy_activity.title, legacy_activity.description), '')
);

COMMIT;
