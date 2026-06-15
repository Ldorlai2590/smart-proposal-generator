-- =============================================================================
-- Migration: 20260615_rls_policies.sql
-- Purpose:   Enable PostgreSQL / Supabase Row Level Security (RLS) on every
--            tenant-scoped table for defense-in-depth multi-tenant isolation.
-- =============================================================================
--
-- WHAT RLS DOES HERE
-- ------------------
-- RLS policies are evaluated only for connections using the Supabase ANON key
-- (and any authenticated end-user JWT). The SERVICE-ROLE key BYPASSES RLS
-- entirely by design (it has the BYPASSRLS attribute). This app performs all
-- user-facing database reads/writes through the service-role admin client
-- (apps/web/lib/supabase/admin.ts → createAdminClient(), using
-- SUPABASE_SERVICE_ROLE_KEY). Therefore enabling RLS is PURELY ADDITIVE and
-- DOES NOT change current app behavior — the app keeps working unchanged.
--
-- RLS is added as defense-in-depth: if an anon-key DB read path is ever
-- introduced (today there is none), these policies enforce tenant isolation
-- automatically instead of silently leaking cross-tenant data.
--
-- -----------------------------------------------------------------------------
-- SAFETY AUDIT FINDINGS (read-only review performed before writing this file)
-- -----------------------------------------------------------------------------
-- KEY RISK CHECKED: the public proposal share page
--   apps/web/app/p/[token]/page.tsx  (+ layout.tsx)
--
--   CONCLUSION: SAFE. The share page does NOT touch the database at all.
--   - page.tsx is a 'use client' component that resolves the proposal via
--     findByShareToken(token) imported from '@/lib/demo-v2' — a pure in-memory
--     demo lookup. No Supabase client (anon OR service-role) is involved.
--   - layout.tsx is a static wrapper with no data access.
--   => Enabling RLS cannot break the public share link, because that path never
--      issues a SQL query. (A permissive public SELECT policy keyed on
--      share_token IS NOT NULL is still added below as documentation/defense for
--      the day this page is wired to the real DB via the anon client.)
--
-- ANON-CLIENT (@/lib/supabase/client.ts) USAGE AUDIT under apps/web/app:
--   createClient() from '@/lib/supabase/client' (browser/anon key) is imported
--   ONLY in auth pages and the Sidebar, and used EXCLUSIVELY for Supabase Auth
--   operations (signInWithPassword, signUp, resetPasswordForEmail, signOut,
--   updateUser, etc.) — NEVER for a .from('<table>') table read/write:
--     - apps/web/app/(auth)/sign-in/page.tsx
--     - apps/web/app/(auth)/sign-up/page.tsx
--     - apps/web/app/(auth)/forgot-password/page.tsx
--     - apps/web/app/(auth)/reset-password/page.tsx
--     - apps/web/components/layout/Sidebar.tsx   (signOut only)
--   A repo grep for `.from(` against every anon-client usage returned NO matches.
--
--   All server-side data access uses either:
--     - the SERVICE-ROLE admin client (apps/web/lib/supabase/admin.ts), or
--     - the SSR server client (apps/web/lib/supabase/server.ts) for auth/session.
--
--   => No user-facing DB READ path uses the anon key today. Enabling RLS is SAFE.
--
-- -----------------------------------------------------------------------------
-- APPLY ORDER
-- -----------------------------------------------------------------------------
--   1. apps/web/db/migrations/0001_supabase_auth.sql   (renames → supabase_user_id)
--   2. apps/web/db/migrations/002_smart_proposal_v2.sql (v2 tables)
--   3. apps/web/db/migrations/003_demo_ready.sql        (proposals.share_token, etc.)
--   4. supabase/migrations/20260601_services.sql        (services table)
--   5. >>> THIS FILE <<<  (run LAST, after all tables/columns exist)
--
--   NOTE on proposal_views: that table has NO tenant_id column (see migration
--   002, section 7 — it only has proposal_id). Its policy below scopes tenancy
--   via a subquery to the parent proposals row. If a tenant_id column is later
--   added to proposal_views by a schema-integrity migration, the direct
--   tenant_isolation pattern can replace the subquery policy. Either way, run
--   THIS file only after proposal_views and proposals both exist.
--
--   `exports` and `proposal_embeddings` are part of the base schema but are not
--   created by any migration file in this repo. Their ENABLE + policy statements
--   are guarded with to_regclass(...) existence checks so this migration is safe
--   to run whether or not those tables have been created yet.
--
-- -----------------------------------------------------------------------------
-- ROLLBACK
-- -----------------------------------------------------------------------------
--   Disable RLS on every table to fully revert (policies can stay — they are
--   inert while RLS is disabled, and DROP POLICY IF EXISTS is also shown):
--
--     ALTER TABLE tenants             DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE users               DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE clients             DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE proposals           DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE companies           DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE services            DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE case_studies        DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE testimonials        DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE proposal_views      DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE proposal_alerts     DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE follow_ups          DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE automation_rules    DISABLE ROW LEVEL SECURITY;
--     -- only if they exist:
--     ALTER TABLE exports             DISABLE ROW LEVEL SECURITY;
--     ALTER TABLE proposal_embeddings DISABLE ROW LEVEL SECURITY;
--
-- -----------------------------------------------------------------------------
-- IDEMPOTENCY
-- -----------------------------------------------------------------------------
--   - Helper uses CREATE OR REPLACE FUNCTION.
--   - Every policy uses DROP POLICY IF EXISTS before CREATE POLICY.
--   - ENABLE ROW LEVEL SECURITY is safe to re-run (no-op if already enabled).
--   - This file is a SQL artifact only. DO NOT execute it against any database
--     as part of generating it.
-- =============================================================================


-- =============================================================================
-- 0. Tenant-resolution helper
-- =============================================================================
-- Maps the current Supabase auth user (auth.uid()) to its tenants.id.
-- SECURITY DEFINER so it can read `tenants` regardless of the caller's own RLS;
-- STABLE so the planner can wrap it in a scalar subquery and cache per-statement.
-- The (SELECT auth.uid()::text) initplan form avoids per-row re-evaluation.

CREATE OR REPLACE FUNCTION my_tenant_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM tenants WHERE supabase_user_id = (SELECT auth.uid()::text)
$$;


-- =============================================================================
-- 1. tenants — self-scoped (policy keys on id, not tenant_id)
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING ( id = (SELECT my_tenant_id()) );


-- =============================================================================
-- 2. Tenant-scoped tables (direct tenant_id column)
-- =============================================================================

-- users -----------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- clients ---------------------------------------------------------------------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- proposals -------------------------------------------------------------------
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON proposals;
CREATE POLICY tenant_isolation ON proposals
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- companies -------------------------------------------------------------------
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON companies;
CREATE POLICY tenant_isolation ON companies
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- services --------------------------------------------------------------------
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON services;
CREATE POLICY tenant_isolation ON services
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- case_studies ----------------------------------------------------------------
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON case_studies;
CREATE POLICY tenant_isolation ON case_studies
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- testimonials ----------------------------------------------------------------
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON testimonials;
CREATE POLICY tenant_isolation ON testimonials
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- proposal_alerts -------------------------------------------------------------
ALTER TABLE proposal_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON proposal_alerts;
CREATE POLICY tenant_isolation ON proposal_alerts
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- follow_ups ------------------------------------------------------------------
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON follow_ups;
CREATE POLICY tenant_isolation ON follow_ups
  USING ( tenant_id = (SELECT my_tenant_id()) );

-- automation_rules ------------------------------------------------------------
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON automation_rules;
CREATE POLICY tenant_isolation ON automation_rules
  USING ( tenant_id = (SELECT my_tenant_id()) );


-- =============================================================================
-- 3. proposal_views — NO tenant_id column (see migration 002 §7)
-- =============================================================================
-- Scope tenancy by joining to the parent proposals row. A view row is visible
-- only when its parent proposal belongs to the caller's tenant.
ALTER TABLE proposal_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON proposal_views;
CREATE POLICY tenant_isolation ON proposal_views
  USING (
    proposal_id IN (
      SELECT id FROM proposals WHERE tenant_id = (SELECT my_tenant_id())
    )
  );


-- =============================================================================
-- 4. Public share read policy on proposals
-- =============================================================================
-- proposals.share_token exists (added in migration 002 / 003). This permissive
-- SELECT policy documents and defends the public share link: should the public
-- share page ever read proposals via the ANON client, only rows with a non-null
-- share_token become readable (no tenant data leak for unshared drafts).
-- It is additive to tenant_isolation — Postgres OR-combines permissive policies.
DROP POLICY IF EXISTS public_share_read ON proposals;
CREATE POLICY public_share_read ON proposals
  FOR SELECT
  USING ( share_token IS NOT NULL );


-- =============================================================================
-- 5. Optional base-schema tables (guarded — may not exist in this repo's DB)
-- =============================================================================
-- `exports` and `proposal_embeddings` are in the documented base schema but are
-- not created by any migration file checked into this repo. Guard with
-- to_regclass so this migration never errors on a DB where they are absent.

DO $$
BEGIN
  IF to_regclass('public.exports') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE exports ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON exports';
    EXECUTE 'CREATE POLICY tenant_isolation ON exports
               USING ( tenant_id = (SELECT my_tenant_id()) )';
  END IF;

  IF to_regclass('public.proposal_embeddings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE proposal_embeddings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON proposal_embeddings';
    EXECUTE 'CREATE POLICY tenant_isolation ON proposal_embeddings
               USING ( tenant_id = (SELECT my_tenant_id()) )';
  END IF;
END
$$;

-- =============================================================================
-- End of migration.
-- =============================================================================
