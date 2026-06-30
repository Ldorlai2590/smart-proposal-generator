-- =============================================================================
-- 20260615_schema_integrity.sql — Schema Integrity Migration
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/tdlubcexihadecfbijir/sql
-- =============================================================================
--
-- PURPOSE
--   Close multi-tenant + referential-integrity gaps confirmed against the live
--   schema (apps/web/db/migrations/0001..003, supabase/migrations/20260601,
--   apps/api/alembic/versions/200b07f62c59_initial_schema.py, apps/web/db/schema.ts):
--
--     1. proposal_views has NO tenant_id  → tenant isolation hole. Add + backfill.
--     2. Foreign keys created with no ON DELETE behavior (default NO ACTION):
--          exports.proposal_id   → should CASCADE
--          proposals.client_id   → should RESTRICT (block deleting a client with proposals)
--          proposals.created_by  → should SET NULL (requires dropping NOT NULL)
--     3. Missing indexes on FK / filter columns:
--          exports(proposal_id)
--          proposal_views(proposal_id, viewed_at DESC)
--          proposal_alerts(tenant_id, created_at DESC)
--          proposal_views(tenant_id)         [new column from fix #1]
--     4. proposal_embeddings has no ANN index → pgvector HNSW (cosine) + proposal_id idx.
--     5. updated_at triggers missing on clients + proposals (set_updated_at() already
--        exists from migration 002; companies + services already wired).
--
-- -----------------------------------------------------------------------------
-- APPLY ORDER  (do NOT reorder — backfill must precede SET NOT NULL)
-- -----------------------------------------------------------------------------
--   STEP A. Run SECTION 1 (one transaction) — adds columns, BACKFILLS data,
--           rewrites FKs, adds triggers. The backfill MUST complete before the
--           SET NOT NULL inside it succeeds.
--
--   STEP B. *** HIGHEST-RISK STEP ***  Before trusting Section 1's
--           `ALTER COLUMN tenant_id SET NOT NULL`, run the safety check:
--
--               SELECT count(*) FROM proposal_views WHERE tenant_id IS NULL;
--
--           It MUST return 0. If it returns > 0, the parent proposal was missing
--           or the UPDATE backfill did not cover those rows — comment out the
--           `SET NOT NULL` line, investigate the orphan rows, then re-run only
--           that one statement once the count is 0.
--
--   STEP C. Run SECTION 2 statements ONE AT A TIME — they use CREATE INDEX
--           CONCURRENTLY and CANNOT run inside a transaction block (and cannot be
--           batched together). Indexes are last because they are non-blocking and
--           safe to add after the structural changes.
--
-- -----------------------------------------------------------------------------
-- NOTE ON CONCURRENTLY + SECTION 1
--   For a clean apply, run Section 1 first and verify the safety check (Step B),
--   THEN run Section 2. The CONCURRENTLY index on proposal_views(tenant_id) reads
--   the column added in Section 1, so Section 1 must be committed first.
-- =============================================================================


-- #############################################################################
-- ## SECTION 1 — RUN IN A TRANSACTION                                        ##
-- ## (ALTER TABLE, backfills, FK rewrites, triggers — all transactional)     ##
-- ## Paste the whole section; wrap in BEGIN/COMMIT if your client does not    ##
-- ## auto-wrap multi-statement scripts.                                       ##
-- #############################################################################

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. proposal_views.tenant_id — add, backfill from parent proposal, enforce
-- -----------------------------------------------------------------------------
ALTER TABLE proposal_views
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill from the parent proposal (must run BEFORE SET NOT NULL below)
UPDATE proposal_views pv
   SET tenant_id = p.tenant_id
  FROM proposals p
 WHERE pv.proposal_id = p.id
   AND pv.tenant_id IS NULL;

-- HIGHEST-RISK LINE — only succeeds if the backfill left zero NULLs.
-- Run  `SELECT count(*) FROM proposal_views WHERE tenant_id IS NULL;`  first;
-- it must return 0. If not, comment this line out, fix the orphans, re-run it alone.
ALTER TABLE proposal_views
  ALTER COLUMN tenant_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Foreign keys — add explicit ON DELETE behavior
--    Constraint names follow PostgreSQL default convention: <table>_<col>_fkey
-- -----------------------------------------------------------------------------

-- exports.proposal_id  → CASCADE (deleting a proposal removes its export rows)
--   `exports` may not exist in every environment (it is not created by the web
--   migrations). Guard with to_regclass so an absent table does NOT abort the
--   whole transaction — `ALTER TABLE ... IF EXISTS` does not cover a missing table.
DO $$
BEGIN
  IF to_regclass('public.exports') IS NOT NULL THEN
    ALTER TABLE exports DROP CONSTRAINT IF EXISTS exports_proposal_id_fkey;
    ALTER TABLE exports
      ADD CONSTRAINT exports_proposal_id_fkey
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- proposals.client_id  → RESTRICT (block deleting a client that has proposals)
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_client_id_fkey;
ALTER TABLE proposals
  ADD CONSTRAINT proposals_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

-- proposals.created_by → SET NULL (keep proposal if the authoring user is deleted)
--   SET NULL requires the column to be nullable, so drop NOT NULL first.
ALTER TABLE proposals
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_created_by_fkey;
ALTER TABLE proposals
  ADD CONSTRAINT proposals_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3. updated_at triggers on clients + proposals
--    set_updated_at() already exists (migration 002). Wire it idempotently.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_clients_updated ON clients;
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated ON proposals;
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- #############################################################################
-- ## END SECTION 1                                                           ##
-- #############################################################################


-- #############################################################################
-- ## SECTION 2 — RUN OUTSIDE ANY TRANSACTION                                 ##
-- ##                                                                          ##
-- ## CREATE INDEX CONCURRENTLY cannot run inside a transaction block.         ##
-- ## Run each statement BELOW ONE AT A TIME in the Supabase SQL editor.       ##
-- ## Do NOT wrap in BEGIN/COMMIT and do NOT select+run multiple at once.      ##
-- ## Section 1 must be committed first (these read columns it created).       ##
-- #############################################################################

-- 3a. FK / tenant filter indexes -------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposal_views_tenant
  ON proposal_views(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exports_proposal_id
  ON exports(proposal_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposal_views_proposal_viewed
  ON proposal_views(proposal_id, viewed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposal_alerts_tenant_created
  ON proposal_alerts(tenant_id, created_at DESC);

-- 4. proposal_embeddings — pgvector HNSW (cosine) ANN index + proposal_id FK index

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_vector
  ON proposal_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_proposal_id
  ON proposal_embeddings(proposal_id);

-- #############################################################################
-- ## END SECTION 2                                                           ##
-- #############################################################################


-- =============================================================================
-- ROLLBACK  (reverse order; run Section-2 drops outside a transaction)
-- =============================================================================
--
-- -- ROLLBACK SECTION 2 (CONCURRENTLY — run one at a time, NOT in a transaction):
--   DROP INDEX CONCURRENTLY IF EXISTS idx_embeddings_proposal_id;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_embeddings_vector;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_proposal_alerts_tenant_created;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_proposal_views_proposal_viewed;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_exports_proposal_id;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_proposal_views_tenant;
--
-- -- ROLLBACK SECTION 1 (transactional):
-- BEGIN;
--   DROP TRIGGER IF EXISTS trg_proposals_updated ON proposals;
--   DROP TRIGGER IF EXISTS trg_clients_updated ON clients;
--
--   -- Restore original FKs (no explicit ON DELETE = NO ACTION, matching prior state)
--   ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_created_by_fkey;
--   ALTER TABLE proposals ADD  CONSTRAINT proposals_created_by_fkey
--     FOREIGN KEY (created_by) REFERENCES users(id);
--   -- NOTE: re-adding NOT NULL only works if no created_by were set NULL by a delete.
--   -- ALTER TABLE proposals ALTER COLUMN created_by SET NOT NULL;
--
--   ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_client_id_fkey;
--   ALTER TABLE proposals ADD  CONSTRAINT proposals_client_id_fkey
--     FOREIGN KEY (client_id) REFERENCES clients(id);
--
--   ALTER TABLE exports DROP CONSTRAINT IF EXISTS exports_proposal_id_fkey;
--   ALTER TABLE exports ADD  CONSTRAINT exports_proposal_id_fkey
--     FOREIGN KEY (proposal_id) REFERENCES proposals(id);
--
--   -- Drop the added tenant_id column (also drops its FK constraint)
--   ALTER TABLE proposal_views DROP COLUMN IF EXISTS tenant_id;
-- COMMIT;
-- =============================================================================
