-- =============================================================================
-- Smart Proposal v2 — Migration 002
-- Adds: companies (provider profile), services (catalog), case_studies,
-- testimonials, expanded clients (AI analysis), expanded proposals (tracking +
-- share token), proposal_views, proposal_alerts, follow_ups.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. companies — Provider company profile (Step 1 of v2 flow)
-- =============================================================================
CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Identidad
    name            VARCHAR(255) NOT NULL,
    website         TEXT,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    country         VARCHAR(100) NOT NULL DEFAULT 'Chile',
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    -- RRSS
    instagram       TEXT,
    facebook        TEXT,
    linkedin        TEXT,
    tiktok          TEXT,
    -- Negocio
    what_we_do      TEXT,
    purpose         TEXT,
    differentiators JSONB DEFAULT '[]',
    ideal_clients   TEXT,
    focus_industries JSONB DEFAULT '[]',
    -- Branding
    logo_url        TEXT,
    brand_manual_url TEXT,
    example_proposal_url TEXT,
    primary_color   VARCHAR(20),
    secondary_color VARCHAR(20),
    accent_color    VARCHAR(20),
    font_heading    VARCHAR(100),
    font_body       VARCHAR(100),
    has_brand_manual BOOLEAN DEFAULT false,
    has_example_proposal BOOLEAN DEFAULT false,
    -- Meta
    onboarding_completed BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);

-- =============================================================================
-- 2. services — Reusable service catalog
-- =============================================================================
CREATE TABLE IF NOT EXISTS services (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    description     TEXT,
    objective       TEXT,
    scope           TEXT,
    includes        JSONB DEFAULT '[]',
    excludes        JSONB DEFAULT '[]',
    duration_estimate VARCHAR(100),
    deliverables    JSONB DEFAULT '[]',
    base_price      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    customizable    BOOLEAN DEFAULT true,
    billing_type    VARCHAR(20) NOT NULL DEFAULT 'one_time'
                    CHECK (billing_type IN ('monthly', 'one_time', 'quarterly', 'project')),
    desired_margin  INTEGER,
    active          BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_company ON services(company_id);

-- =============================================================================
-- 3. case_studies — Provider's case studies
-- =============================================================================
CREATE TABLE IF NOT EXISTS case_studies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    industry        VARCHAR(100),
    problem_solved  TEXT,
    solution        TEXT,
    result          TEXT,
    client_name     VARCHAR(255),
    country         VARCHAR(100),
    tags            JSONB DEFAULT '[]',
    metrics         JSONB DEFAULT '[]',
    image_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_studies_tenant ON case_studies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON case_studies(industry);

-- =============================================================================
-- 4. testimonials
-- =============================================================================
CREATE TABLE IF NOT EXISTS testimonials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    author_name     VARCHAR(255) NOT NULL,
    author_role     VARCHAR(255),
    client_company  VARCHAR(255),
    quote           TEXT NOT NULL,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    photo_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_tenant ON testimonials(tenant_id);

-- =============================================================================
-- 5. clients — Expanded with persona contacto + AI analysis
-- =============================================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_role VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS size VARCHAR(50)
    CHECK (size IS NULL OR size IN ('micro', 'pyme', 'mediana', 'corporativo'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS employees_count INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS estimated_revenue VARCHAR(100);
-- AI analysis columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_business_model TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_value_prop TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_digital_maturity INTEGER
    CHECK (ai_digital_maturity IS NULL OR ai_digital_maturity BETWEEN 0 AND 100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_opportunities JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_weaknesses JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_communication_tone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_competitors JSONB DEFAULT '[]';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_executive_summary TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- =============================================================================
-- 6. proposals — Expanded with share token + tracking columns
-- =============================================================================
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_url TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_view_seconds INTEGER DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS intention_score VARCHAR(20)
    DEFAULT 'none' CHECK (intention_score IN ('high', 'medium', 'low', 'none'));
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS sent_via VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON proposals(share_token);
CREATE INDEX IF NOT EXISTS idx_proposals_intention ON proposals(intention_score);

-- =============================================================================
-- 7. proposal_views — Tracking events
-- =============================================================================
CREATE TABLE IF NOT EXISTS proposal_views (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    viewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_country      VARCHAR(2),
    ip_city         VARCHAR(100),
    device          VARCHAR(20) CHECK (device IN ('mobile', 'desktop', 'tablet', 'unknown')),
    user_agent      TEXT,
    pages_viewed    JSONB DEFAULT '[]',
    total_seconds   INTEGER DEFAULT 0,
    exit_section    VARCHAR(100),
    referrer        TEXT
);
CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal ON proposal_views(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_views_date ON proposal_views(viewed_at);

-- =============================================================================
-- 8. proposal_alerts — Real-time intelligence alerts for the seller
-- =============================================================================
CREATE TABLE IF NOT EXISTS proposal_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proposal_id     UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('opened', 'reopened', 'pricing_viewed',
                                   'case_viewed', 'no_open_5d', 'expiring_soon',
                                   'high_intention', 'cold')),
    message         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    read            BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON proposal_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON proposal_alerts(tenant_id, read)
    WHERE read = false;

-- =============================================================================
-- 9. follow_ups — Tracked follow-up messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS follow_ups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proposal_id     UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'call', 'manual')),
    ai_suggested_subject TEXT,
    ai_suggested_message TEXT,
    actual_message  TEXT,
    sent            BOOLEAN DEFAULT false,
    sent_at         TIMESTAMPTZ,
    response_received BOOLEAN DEFAULT false,
    response_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_followups_proposal ON follow_ups(proposal_id);

-- =============================================================================
-- 10. automation_rules — Auto follow-up rules per tenant
-- =============================================================================
CREATE TABLE IF NOT EXISTS automation_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    trigger_type    VARCHAR(50) NOT NULL
                    CHECK (trigger_type IN ('no_open_after_days',
                                           'opened_no_response_after_days',
                                           'high_intention_no_meeting',
                                           'pricing_viewed_no_response')),
    trigger_days    INTEGER,
    action_channel  VARCHAR(20) CHECK (action_channel IN ('email', 'whatsapp', 'task')),
    action_template TEXT,
    active          BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_tenant ON automation_rules(tenant_id, active);

-- =============================================================================
-- 11. updated_at trigger helper (idempotent)
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated ON companies;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated ON services;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- DONE — Smart Proposal v2 schema
-- =============================================================================
