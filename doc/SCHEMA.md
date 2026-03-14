# Schema

## Status
Initial Supabase schema has been modeled in `supabase/migrations/20260314110833_auth_rbac_foundation.sql`, `supabase/migrations/20260314124500_compliance_incidents.sql`, `supabase/migrations/20260314131500_risk_assessments.sql`, `supabase/migrations/20260314145504_training_records.sql`, `supabase/migrations/20260314154500_business_associate_agreements.sql`, `supabase/migrations/20260314151704_security_policies.sql`, `supabase/migrations/20260314161000_backup_records.sql`, `supabase/migrations/20260314163500_ehr_integrations.sql`, `supabase/migrations/20260314170005_data_classifications.sql`, and `supabase/migrations/20260314171500_integration_sync_runs.sql`.

## Current Tables
- `organizations`
  Single-organization workspace metadata including name, slug, type, and creator.
- `profiles`
  User profile mirror for `auth.users`, maintained by a trigger on signup/invite acceptance.
- `organization_memberships`
  Active membership and role assignment per user, constrained to one active organization per user.
- `invitations`
  Invite lifecycle records with role, expiry, and linked auth user metadata.
- `audit_logs`
  Append-oriented event log for auth, membership, compliance, and incident actions.
- `compliance_controls`
  HIPAA control register with category, status, due date, evidence summary, and notes.
- `incident_reports`
  Incident workflow records with severity, status, affected system, summary, and response notes.
- `risk_assessments`
  Organization risk register entries with likelihood, impact, derived score, mitigation plan, target date, and lifecycle status.
- `training_records`
  Organization staff training assignments with assignee, due date, completion state, and completion evidence notes.
- `business_associate_agreements`
  Vendor BAA tracking records with status, signature/renewal dates, document URL, and legal notes.
- `security_policies`
  Organization security policy records with policy type, effective/review dates, owner membership, and lifecycle status.
- `backup_records`
  Backup and recovery tracking records with system scope, schedule markers, retention, notes, and lifecycle status.
- `ehr_integrations`
  Initial EHR integration connector metadata with provider, environment mode, sync status, cadence, and last sync timestamp.
- `data_classifications`
  Data sensitivity registry for organizational assets with PHI/PII markers, encryption requirements, retention, and classification level.
- `integration_sync_runs`
  EHR integration monitoring telemetry for accepted sync requests, trigger/source metadata, and run lifecycle status.

## Enums
- `app_role`
  `org_admin`, `compliance_manager`, `staff`
- `membership_status`
  `invited`, `active`, `revoked`
- `invitation_status`
  `pending`, `accepted`, `revoked`, `expired`
- `compliance_control_status`
  `not_started`, `in_progress`, `needs_review`, `compliant`, `at_risk`
- `incident_severity`
  `low`, `medium`, `high`, `critical`
- `incident_status`
  `open`, `investigating`, `contained`, `resolved`, `closed`
- `risk_assessment_status`
  `identified`, `mitigating`, `accepted`, `closed`
- `training_record_status`
  `not_started`, `in_progress`, `completed`, `overdue`
- `baa_status`
  `draft`, `under_review`, `active`, `expired`, `terminated`
- `security_policy_status`
  `draft`, `under_review`, `active`, `retired`
- `backup_record_status`
  `scheduled`, `running`, `successful`, `failed`, `paused`
- `ehr_provider`
  `athenahealth`, `epic`, `cerner`, `other`
- `integration_status`
  `not_connected`, `connected`, `syncing`, `error`, `paused`
- `integration_mode`
  `sandbox`, `production`
- `data_classification_level`
  `public`, `internal`, `confidential`, `phi_restricted`
- `integration_sync_run_status`
  `accepted`, `processing`, `succeeded`, `failed`
- `integration_sync_trigger`
  `manual`, `scheduled`, `retry`

## Security Model
- RLS is enabled on all persisted application tables.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage invitations, audit logs, compliance controls, incidents, and risks.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage training records.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage BAA records.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage security policy records.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage backup records.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage EHR integration records.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage data classification records.
- Privileged organization roles (`org_admin`, `compliance_manager`) can read and manage integration sync run telemetry.
- Standard users can read only training records assigned to their own user account.
- Standard users can read their own profile and active membership only.
- The app uses service-role backed server actions for privileged writes and still checks application permissions before each mutation.

## Supporting Functions And Triggers
- `set_updated_at()`
  Shared trigger helper for `updated_at` bookkeeping.
- `is_org_member(uuid)`
  Security definer helper for active-organization checks.
- `has_org_role(uuid, app_role[])`
  Security definer helper for privileged RLS checks.
- `handle_new_user_profile()`
  Trigger that upserts a `profiles` row after new `auth.users` creation.

## Index Highlights
- One active membership per user across organizations.
- One pending invite per organization and email.
- Organization/status indexes for compliance controls and incidents.
- Organization/score and organization/status indexes for risk assessments.
- Organization/status and assignee/due-date indexes for training records.
- Organization/status and renewal-date indexes for BAA records.
- Organization/status and review-date indexes for security policy records.
- Organization/status and next-scheduled indexes for backup records.
- Organization/status and provider indexes for EHR integrations.
- Organization/level and PHI/encryption indexes for data classifications.
- Organization/requested-at, organization/status, and integration/requested-at indexes for integration sync runs.
- Audit log index on `(organization_id, created_at desc)` for dashboard activity queries.
