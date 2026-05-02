-- Script to drop DB triggers and their functions
-- Run in Supabase SQL editor AFTER you have deployed and tested the client-side replacements

BEGIN;

-- Drop triggers (idempotent)
DROP TRIGGER IF EXISTS trg_update_balance_expense ON public.expenses;
DROP TRIGGER IF EXISTS trg_update_balance_payment ON public.credit_card_payments;
-- Drop income triggers for both legacy and current tables
DROP TRIGGER IF EXISTS trg_update_balance_income ON public.monthly_incomes;
DROP TRIGGER IF EXISTS trg_update_balance_income ON public.incomes;

-- Remove functions; use CASCADE to ensure any remaining dependent objects are removed.
DROP FUNCTION IF EXISTS public.update_card_balance_on_expense() CASCADE;
DROP FUNCTION IF EXISTS public.update_balances_on_payment() CASCADE;
DROP FUNCTION IF EXISTS public.update_balance_on_income() CASCADE;

COMMIT;

-- Note: do NOT run this until all clients call the new JS handlers
