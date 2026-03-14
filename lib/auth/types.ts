import type { User } from "@supabase/supabase-js";

import type { AppRole, InvitationStatus, MembershipStatus } from "@/lib/auth/permissions";
import type { ComplianceControlStatus } from "@/lib/validations/compliance";
import type { BaaStatus } from "@/lib/validations/baa";
import type { BackupRecordStatus } from "@/lib/validations/backup";
import type { IncidentSeverity, IncidentStatus } from "@/lib/validations/incidents";
import type { SecurityPolicyStatus } from "@/lib/validations/policies";
import type { RiskAssessmentStatus } from "@/lib/validations/risks";
import type { TrainingRecordStatus } from "@/lib/validations/training";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
};

export type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
};

export type Membership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  status: MembershipStatus;
  organizations: Organization | null;
};

export type Invitation = {
  id: string;
  organization_id: string;
  email: string;
  role: AppRole;
  status: InvitationStatus;
  expires_at: string;
  auth_user_id: string | null;
};

export type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export type ComplianceControl = {
  id: string;
  organization_id: string;
  control_code: string;
  title: string;
  category: string;
  status: ComplianceControlStatus;
  due_date: string | null;
  evidence_summary: string | null;
};

export type IncidentReport = {
  id: string;
  organization_id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affected_system: string | null;
  summary: string;
  detected_at: string;
};

export type RiskAssessment = {
  id: string;
  organization_id: string;
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  status: RiskAssessmentStatus;
  mitigation_plan: string | null;
  target_date: string | null;
};

export type TrainingRecord = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_user_id: string;
  due_date: string | null;
  status: TrainingRecordStatus;
  completed_at: string | null;
  completion_notes: string | null;
};

export type BusinessAssociateAgreement = {
  id: string;
  organization_id: string;
  vendor_name: string;
  contact_email: string | null;
  status: BaaStatus;
  signed_at: string | null;
  renewal_date: string | null;
  document_url: string | null;
  notes: string | null;
};

export type BackupRecord = {
  id: string;
  organization_id: string;
  system_name: string;
  backup_scope: string;
  status: BackupRecordStatus;
  last_success_at: string | null;
  next_scheduled_at: string | null;
  retention_days: number;
  notes: string | null;
};

export type SecurityPolicy = {
  id: string;
  organization_id: string;
  policy_name: string;
  category: string;
  version: string;
  status: SecurityPolicyStatus;
  effective_date: string | null;
  next_review_date: string | null;
  document_url: string | null;
  summary: string | null;
};

export type CurrentUserContext = {
  user: User;
  profile: Profile | null;
  membership: Membership | null;
  organization: Organization | null;
  role: AppRole | null;
  aal: string | null;
  needsMfa: boolean;
};
