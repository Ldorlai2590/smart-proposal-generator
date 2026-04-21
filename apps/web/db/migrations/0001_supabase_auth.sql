-- Migration: Replace Clerk columns with Supabase Auth
-- Renames clerk_org_id → supabase_user_id in tenants
-- Renames clerk_user_id → supabase_user_id in users

ALTER TABLE tenants RENAME COLUMN clerk_org_id TO supabase_user_id;
ALTER TABLE users RENAME COLUMN clerk_user_id TO supabase_user_id;
