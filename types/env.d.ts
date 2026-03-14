declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    E2E_USER_EMAIL?: string;
    E2E_USER_PASSWORD?: string;
    E2E_STAFF_EMAIL?: string;
    E2E_STAFF_PASSWORD?: string;
    E2E_ORG_SLUG?: string;
    E2E_ORG_NAME?: string;
    E2E_RISK_TITLE_PREFIX?: string;
    E2E_BAA_VENDOR_PREFIX?: string;
    E2E_BACKUP_SYSTEM_PREFIX?: string;
    E2E_RESET_USER?: string;
    INTEGRATION_SYNC_TOKEN?: string;
    INTEGRATION_SYNC_RATE_LIMIT_PER_MINUTE?: string;
  }
}
