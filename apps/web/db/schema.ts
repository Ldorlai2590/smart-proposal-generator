import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  jsonb,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------
// plan: 'free' | 'pro' | 'enterprise'
// trialStage:
//   'no_card'    → primeros 30 días sin tarjeta
//   'with_card'  → 30 días adicionales tras añadir tarjeta (pre-charge)
//   'active'     → suscripción pagada activa
//   'expired'    → trial agotado, acceso bloqueado hasta pagar
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseUserId: varchar('supabase_user_id', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),

  // Trial híbrido 30 + 30 días
  trialStartedAt: timestamp('trial_started_at', { withTimezone: true }).defaultNow().notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }).notNull(),
  trialStage: varchar('trial_stage', { length: 20 }).default('no_card').notNull(),
  cardOnFile: boolean('card_on_file').default(false).notNull(),

  // Stripe
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),

  // Metered usage (propuestas generadas en el período actual)
  proposalsUsed: integer('proposals_used').default(0).notNull(),
  proposalsQuota: integer('proposals_quota').default(999999).notNull(),

  // Onboarding
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  supabaseUserId: varchar('supabase_user_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ---------------------------------------------------------------------------
// clients
// ---------------------------------------------------------------------------
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  email: varchar('email', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  score: integer('score').default(0),

  // v2 — Persona de contacto (002 / 003)
  contactName: varchar('contact_name', { length: 255 }),
  contactRole: varchar('contact_role', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),

  // v2 — Web + RRSS (TEXT en la migración)
  website: text('website'),
  instagram: text('instagram'),
  facebook: text('facebook'),
  linkedin: text('linkedin'),
  tiktok: text('tiktok'),

  // v2 — Datos de empresa
  country: varchar('country', { length: 100 }),
  // CHECK: size IN ('micro','pyme','mediana','corporativo')
  size: varchar('size', { length: 50 }),
  employeesCount: integer('employees_count'),
  estimatedRevenue: varchar('estimated_revenue', { length: 100 }),

  // v2 — Análisis IA
  aiBusinessModel: text('ai_business_model'),
  aiValueProp: text('ai_value_prop'),
  // CHECK: ai_digital_maturity BETWEEN 0 AND 100
  aiDigitalMaturity: integer('ai_digital_maturity'),
  aiOpportunities: jsonb('ai_opportunities').default([]),
  aiWeaknesses: jsonb('ai_weaknesses').default([]),
  aiCommunicationTone: text('ai_communication_tone'),
  aiCompetitors: jsonb('ai_competitors').default([]),
  aiExecutiveSummary: text('ai_executive_summary'),
  aiAnalyzedAt: timestamp('ai_analyzed_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert

// ---------------------------------------------------------------------------
// services — Catálogo de servicios reutilizables
// ---------------------------------------------------------------------------
// NOTA: refleja la definición LIVE en supabase/migrations/20260601_services.sql
//   - company_id es TEXT (ref suelta a branding del tenant, sin FK)
//   - includes / excludes / deliverables son TEXT[] (no JSONB)
//   - desired_margin es NUMERIC(5,2)
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  // Ref suelta a branding del tenant — sin FK en la DB live
  companyId: text('company_id'),
  name: varchar('name', { length: 300 }).notNull(),
  category: varchar('category', { length: 100 }).default('').notNull(),
  description: text('description').default(''),
  objective: text('objective'),
  scope: text('scope'),
  includes: text('includes').array().default([]),
  excludes: text('excludes').array().default([]),
  durationEstimate: varchar('duration_estimate', { length: 200 }),
  deliverables: text('deliverables').array().default([]),
  basePrice: numeric('base_price', { precision: 12, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  customizable: boolean('customizable').default(false),
  billingType: varchar('billing_type', { length: 50 }).default('one_time'),
  desiredMargin: numeric('desired_margin', { precision: 5, scale: 2 }),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert

// ---------------------------------------------------------------------------
// proposals
// ---------------------------------------------------------------------------
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 500 }),
  status: varchar('status', { length: 50 }).default('draft'),
  templateId: varchar('template_id', { length: 100 }),
  context: jsonb('context').default({}),
  sections: jsonb('sections').default({}),
  tokensUsed: integer('tokens_used').default(0),
  model: varchar('model', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Proposal = typeof proposals.$inferSelect
export type NewProposal = typeof proposals.$inferInsert

// ---------------------------------------------------------------------------
// exports
// ---------------------------------------------------------------------------
export const exports_ = pgTable('exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  proposalId: uuid('proposal_id')
    .notNull()
    .references(() => proposals.id),
  format: varchar('format', { length: 20 }).notNull(),
  fileUrl: text('file_url'),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Export = typeof exports_.$inferSelect
export type NewExport = typeof exports_.$inferInsert

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  services: many(services),
  proposals: many(proposals),
  exports: many(exports_),
}))

export const servicesRelations = relations(services, ({ one }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  proposals: many(proposals),
}))

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
  proposals: many(proposals),
}))

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [proposals.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [proposals.clientId], references: [clients.id] }),
  createdByUser: one(users, { fields: [proposals.createdBy], references: [users.id] }),
  exports: many(exports_),
}))

export const exportsRelations = relations(exports_, ({ one }) => ({
  tenant: one(tenants, { fields: [exports_.tenantId], references: [tenants.id] }),
  proposal: one(proposals, { fields: [exports_.proposalId], references: [proposals.id] }),
}))
