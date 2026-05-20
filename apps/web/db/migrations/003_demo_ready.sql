-- =============================================================================
-- 003_demo_ready.sql — Ejecutar en Supabase SQL Editor
-- Agrega columnas de trial, billing y tracking que faltan.
-- Todas las sentencias usan ADD COLUMN IF NOT EXISTS — safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. tenants — Sistema de trial híbrido 30+30 + Stripe
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS trial_stage            VARCHAR(20)  NOT NULL DEFAULT 'no_card',
  ADD COLUMN IF NOT EXISTS card_on_file           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS proposals_used         INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposals_quota        INTEGER      NOT NULL DEFAULT 999999,
  ADD COLUMN IF NOT EXISTS onboarding_completed   BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata               JSONB                 DEFAULT '{}';

-- Fijar trial_ends_at para tenants existentes (created_at + 30 días)
UPDATE tenants
  SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE trial_ends_at <= trial_started_at + INTERVAL '1 second';

-- ---------------------------------------------------------------------------
-- 2. clients — Contacto, redes sociales y análisis AI
-- ---------------------------------------------------------------------------
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contact_name          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_role          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website               TEXT,
  ADD COLUMN IF NOT EXISTS instagram             TEXT,
  ADD COLUMN IF NOT EXISTS facebook              TEXT,
  ADD COLUMN IF NOT EXISTS linkedin              TEXT,
  ADD COLUMN IF NOT EXISTS tiktok                TEXT,
  ADD COLUMN IF NOT EXISTS country               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS size                  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS employees_count       INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_revenue     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ai_business_model     TEXT,
  ADD COLUMN IF NOT EXISTS ai_value_prop         TEXT,
  ADD COLUMN IF NOT EXISTS ai_digital_maturity   INTEGER CHECK (ai_digital_maturity IS NULL OR ai_digital_maturity BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ai_opportunities      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_weaknesses         JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_communication_tone TEXT,
  ADD COLUMN IF NOT EXISTS ai_competitors        JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_executive_summary  TEXT,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at        TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. proposals — Share token y tracking de apertura
-- ---------------------------------------------------------------------------
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS share_token          VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS share_url            TEXT,
  ADD COLUMN IF NOT EXISTS sent_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_viewed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_count           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_view_seconds   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intention_score      VARCHAR(20) DEFAULT 'none'
    CHECK (intention_score IN ('high', 'medium', 'low', 'none')),
  ADD COLUMN IF NOT EXISTS sent_via             VARCHAR(20);

-- ---------------------------------------------------------------------------
-- 4. Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON proposals(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_intention   ON proposals(intention_score);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_cus    ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- FIN — Pegar en: https://supabase.com/dashboard/project/tdlubcexihadecfbijir/sql
-- =============================================================================
