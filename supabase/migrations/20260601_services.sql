-- Services catalog table
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/tdlubcexihadecfbijir/sql

CREATE TABLE IF NOT EXISTS services (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id        TEXT,                              -- loose ref to tenant branding, no FK
    name              VARCHAR(300) NOT NULL,
    category          VARCHAR(100) NOT NULL DEFAULT '',
    description       TEXT DEFAULT '',
    objective         TEXT,
    scope             TEXT,
    includes          TEXT[] DEFAULT '{}',
    excludes          TEXT[] DEFAULT '{}',
    duration_estimate VARCHAR(200),
    deliverables      TEXT[] DEFAULT '{}',
    base_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency          VARCHAR(10) DEFAULT 'USD',
    customizable      BOOLEAN DEFAULT FALSE,
    billing_type      VARCHAR(50) DEFAULT 'one_time',
    desired_margin    NUMERIC(5,2),
    active            BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_tenant        ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON services(tenant_id, active);
