-- Add 'admin' to the app_role enum
-- This must be in its own transaction before being used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';