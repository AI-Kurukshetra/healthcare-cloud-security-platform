# Decisions

## 2026-03-14
- Use a greenfield setup because the repository only contained `AGENTS.md`.
  Rationale: There is no existing application code to preserve or adapt.
- Create a scaffold-first baseline before product features.
  Rationale: This aligns with the repo process requirements and provides a stable starting point for future work.
- Allow the app shell and middleware to run without Supabase env values, but keep protected routes gated behind configuration.
  Rationale: This keeps the scaffold usable for local setup while avoiding fake auth behavior.
- Use ESLint 9 flat config with `FlatCompat` to consume Next.js lint presets.
  Rationale: `eslint-config-next` still exposes legacy-style config objects that need a compatibility bridge.
- Treat the product as a HIPAA-compliant healthcare security/compliance SaaS platform.
  Rationale: The PDF centers the opportunity on healthcare cloud security, auditability, and compliance operations rather than practice management workflows.
- Keep the PDF's market and feature guidance, but preserve the repository's canonical implementation stack.
  Rationale: `AGENTS.md` defines non-negotiable technical standards for execution in this codebase.
- Make the first domain feature a lightweight compliance-and-incident operations dashboard instead of a reporting export flow.
  Rationale: This delivers real operational value from the PRD with minimal extra infrastructure and builds directly on the RBAC/audit foundation already in place.
- Implement the next slice as a risk register instead of evidence file uploads.
  Rationale: It is a core PRD entity, fits current Supabase table/action patterns, and avoids object-storage complexity while still improving operational prioritization.
- Deliver reporting as server-side CSV exports first (not PDF/UI-heavy reporting).
  Rationale: CSV can be shipped quickly on top of existing schema, supports audit prep workflows immediately, and avoids introducing extra rendering/storage complexity in MVP.
- Model policy management as a versioned `security_policies` register instead of single mutable organization policy fields.
  Rationale: Version history and review cycles are core to audit readiness, and this structure aligns with existing compliance/risk panel patterns.
- Model the first integration path as an `ehr_integrations` metadata registry (provider/mode/status/sync cadence) instead of direct EHR data ingestion.
  Rationale: This de-risks initial delivery, supports operational visibility, and creates a secure stepping stone for future API sync endpoints.
- Implement initial integration sync security with a static token and in-memory rate limiter.
  Rationale: It provides immediate protection for the first API surface while keeping implementation lightweight; can be replaced by secret rotation and distributed rate limiting in a later phase.
- Model data-classification as an asset-centric register (`data_classifications`) with explicit PHI/PII and encryption flags.
  Rationale: This creates an actionable baseline for handling controls and reporting without requiring complex lineage tooling in the first release.
- Model EHR monitoring as a dedicated `integration_sync_runs` telemetry table keyed by `request_id` instead of relying only on generic audit events.
  Rationale: Structured run records support dashboard monitoring and future sync lifecycle updates while audit logs remain the immutable sensitive-action trail.
