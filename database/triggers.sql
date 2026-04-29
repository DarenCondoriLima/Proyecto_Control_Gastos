CREATE OR REPLACE FUNCTION public.update_card_balance_on_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- No impactar saldos para gastos excluidos o ya eliminados
    IF NEW.exclude_from_balance IS TRUE OR NEW.deleted_exp IS TRUE THEN
        RETURN NEW;
    END IF;

    -- Si no hay cuenta asociada no se puede afectar balance
    IF NEW.id_card IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.payment_method IN ('Debit', 'Cash') THEN
        UPDATE public.cards
        SET current_balance = current_balance - NEW.amount_exp
        WHERE id_card = NEW.id_card;
    ELSIF NEW.payment_method = 'Credit' THEN
        UPDATE public.cards
        SET current_balance = current_balance + NEW.amount_exp
        WHERE id_card = NEW.id_card;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_balance_expense ON public.expenses;
CREATE TRIGGER trg_update_balance_expense
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_card_balance_on_expense();

CREATE OR REPLACE FUNCTION public.update_balances_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Descontar del origen (si aplica)
    IF NEW.source_account IS NOT NULL THEN
        UPDATE public.cards
        SET current_balance = current_balance - NEW.amount_paid
        WHERE id_card = NEW.source_account;
    END IF;

    -- 2. Reducir deuda en tarjeta de crédito destino
    UPDATE public.cards
    SET current_balance = current_balance - NEW.amount_paid
    WHERE id_card = NEW.id_card;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_balance_payment ON public.credit_card_payments;
CREATE TRIGGER trg_update_balance_payment
AFTER INSERT ON public.credit_card_payments
FOR EACH ROW EXECUTE FUNCTION public.update_balances_on_payment();

CREATE OR REPLACE FUNCTION public.update_balance_on_income()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Los ingresos siempre aumentan el saldo de la cuenta destino
    IF NEW.id_card IS NOT NULL THEN
        UPDATE public.cards
        SET current_balance = current_balance + NEW.amount_income
        WHERE id_card = NEW.id_card;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_balance_income ON public.monthly_incomes;
CREATE TRIGGER trg_update_balance_income
AFTER INSERT ON public.monthly_incomes
FOR EACH ROW EXECUTE FUNCTION public.update_balance_on_income();