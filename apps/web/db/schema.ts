import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: varchar('clerk_org_id', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 50 }).default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
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
  clerkUserId: varchar('clerk_user_id', { length: 255 }).unique().notNull(),
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
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert

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
  proposals: many(proposals),
  exports: many(exports_),
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
