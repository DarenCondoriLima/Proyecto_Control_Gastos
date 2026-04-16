CREATE OR REPLACE FUNCTION update_card_balance_on_expense()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.payment_method = 'Debit' OR NEW.payment_method = 'Cash') THEN
        UPDATE public.Cards 
        SET CURRENT_BALANCE = CURRENT_BALANCE - NEW.amount_exp
        WHERE ID_CARD = NEW.id_card;
    ELSIF (NEW.payment_method = 'Credit') THEN
        UPDATE public.Cards 
        SET CURRENT_BALANCE = CURRENT_BALANCE + NEW.amount_exp
        WHERE ID_CARD = NEW.id_card;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance_expense
AFTER INSERT ON public.Expenses
FOR EACH ROW EXECUTE FUNCTION update_card_balance_on_expense();

CREATE OR REPLACE FUNCTION update_balances_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Reducir deuda en la tarjeta de crédito (Destino)
    UPDATE public.Cards 
    SET CURRENT_BALANCE = CURRENT_BALANCE - NEW.amount_paid
    WHERE ID_CARD = NEW.id_card;

    -- 2. Reducir dinero real en la cuenta de ahorros (Origen)
    UPDATE public.Cards 
    SET CURRENT_BALANCE = CURRENT_BALANCE - NEW.amount_paid
    WHERE ID_CARD = NEW.source_account;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance_payment
AFTER INSERT ON public.credit_card_payments
FOR EACH ROW EXECUTE FUNCTION update_balances_on_payment();

CREATE OR REPLACE FUNCTION update_balance_on_income()
RETURNS TRIGGER AS $$
BEGIN
    -- Los ingresos siempre aumentan el saldo de la cuenta destino
    -- Asumimos que en tu tabla 'incomes' tienes una columna 'id_card' o similar
    UPDATE public.Cards 
    SET CURRENT_BALANCE = CURRENT_BALANCE + NEW.amount_income
    WHERE ID_CARD = NEW.id_card; -- Asegúrate que la tabla incomes tenga id_card

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balance_income
AFTER INSERT ON public.incomes -- O la tabla donde registres tus entradas de dinero
FOR EACH ROW EXECUTE FUNCTION update_balance_on_income();


CREATE OR REPLACE FUNCTION update_balances_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Restar el dinero de la cuenta de origen (Tu Efectivo o Tarjeta de Débito)
    -- Solo se ejecuta si seleccionaste de dónde salió la plata.
    IF NEW.source_account IS NOT NULL THEN
        UPDATE public.cards
        SET current_balance = current_balance - NEW.amount_paid
        WHERE id_card = NEW.source_account;
    END IF;

    -- 2. Restar la deuda de la Tarjeta de Crédito
    -- Asumiendo que el current_balance de la TC es positivo (representando deuda acumulada)
    UPDATE public.cards
    SET current_balance = current_balance - NEW.amount_paid
    WHERE id_card = NEW.id_card;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_card_balance_on_expense()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 🛑 MEJORA: Ignorar si tiene la bandera de exclusión o si está marcado como eliminado
    IF NEW.exclude_from_balance = TRUE OR NEW.deleted_exp = TRUE THEN
        RETURN NEW;
    END IF;

    -- =============================================================
    -- Lógica original de actualización de saldos
    -- =============================================================
    IF (NEW.payment_method = 'Debit' OR NEW.payment_method = 'Cash') THEN
        UPDATE public.Cards 
        SET CURRENT_BALANCE = CURRENT_BALANCE - NEW.amount_exp
        WHERE ID_CARD = NEW.id_card;
    ELSIF (NEW.payment_method = 'Credit') THEN
        UPDATE public.Cards 
        SET CURRENT_BALANCE = CURRENT_BALANCE + NEW.amount_exp
        WHERE ID_CARD = NEW.id_card;
    END IF;
    
    RETURN NEW;
END;
$function$;