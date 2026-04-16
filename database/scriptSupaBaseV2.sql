-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE public.Users(
    ID_USER         UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    NAME_USER       VARCHAR(50)  NOT NULL UNIQUE,
    FIRSTNAME_USER  VARCHAR(50)  NOT NULL,
    LASTNAME_USER   VARCHAR(75)  NOT NULL,
    ROLE_USER       VARCHAR(25)  NOT NULL DEFAULT 'User',
    EMAIL_USER      VARCHAR(255) NOT NULL UNIQUE,
    PASSWORD_USER   VARCHAR(255) NOT NULL,
    DATEBIRTH_USER  DATE          NOT NULL,
    IMAGE_USER      VARCHAR(255) NULL,
    DELETED_USER    BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. CARDS (Con columna CURRENT_BALANCE)
-- =============================================
CREATE TABLE public.Cards(
    ID_CARD      UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER      UUID          NOT NULL REFERENCES Users(ID_USER),
    NAME_CARD    VARCHAR(50)  NOT NULL,
    TYPE_CARD    VARCHAR(10)  NOT NULL CHECK (TYPE_CARD IN ('Debit', 'Credit', 'Cash')),
    CURRENCY     VARCHAR(3)   NOT NULL DEFAULT 'PEN', 
    LIMIT_CARD   DECIMAL(15,2) NULL,
    CURRENT_BALANCE DECIMAL(15,2) DEFAULT 0.00, -- Saldo en tiempo real
    CUTOFF_DAY   SMALLINT      NULL CHECK (CUTOFF_DAY BETWEEN 1 AND 31),
    DUE_DAY      SMALLINT      NULL CHECK (DUE_DAY BETWEEN 1 AND 31),
    DELETED_CARD BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. CATEGORIES & SUBCATEGORIES
-- =============================================
CREATE TABLE public.Categories(
    ID_CAT      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER     UUID         NOT NULL REFERENCES Users(ID_USER),
    NAME_CAT    VARCHAR(50) NOT NULL,
    TYPE_CAT    VARCHAR(10)  DEFAULT 'gasto' CHECK (TYPE_CAT IN ('gasto', 'ingreso')),
    GLOBAL_CAT  BOOLEAN      NOT NULL DEFAULT FALSE,
    DELETED_CAT BOOLEAN      NOT NULL DEFAULT FALSE,
    CREATED_AT  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.SubCategories(
    ID_SUBCAT      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_CATEGORY    UUID         NOT NULL REFERENCES Categories(ID_CAT),
    ID_USER        UUID         NOT NULL REFERENCES Users(ID_USER),
    NAME_SUBCAT    VARCHAR(50) NOT NULL,
    DELETED_SUBCAT BOOLEAN      NOT NULL DEFAULT FALSE,
    CREATED_AT     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. EXPENSES (Registro de Gastos)
-- =============================================
CREATE TABLE public.Expenses(
    ID_EXP          UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_CATEGORY     UUID          NOT NULL REFERENCES Categories(ID_CAT),
    ID_SUBCAT       UUID          NULL REFERENCES SubCategories(ID_SUBCAT),
    ID_USER         UUID          NOT NULL REFERENCES Users(ID_USER),
    ID_CARD         UUID          NULL REFERENCES Cards(ID_CARD),
    DATE_EXP        DATE          NOT NULL,
    DESCRIPTION_EXP VARCHAR(500) NOT NULL,
    AMOUNT_EXP      DECIMAL(15,2) NOT NULL,
    PAYMENT_METHOD  VARCHAR(10)  NOT NULL CHECK (PAYMENT_METHOD IN ('Cash', 'Debit', 'Credit')),
    INSTALLMENTS    SMALLINT      NOT NULL DEFAULT 1,
    INSTALLMENT_AMT DECIMAL(15,2) NULL, 
    DELETED_EXP     BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. CREDIT CARD PAYMENTS (Atribución de ciclos)
-- =============================================
CREATE TABLE public.credit_card_payments (
    id_payment      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    id_user         uuid REFERENCES auth.users(id),
    id_card         uuid REFERENCES public.cards(id_card), -- Tarjeta de crédito destino
    amount_paid     NUMERIC(15,2) NOT NULL,
    date_payment    DATE DEFAULT CURRENT_DATE,
    source_account  uuid REFERENCES public.cards(id_card), -- Cuenta de origen (Débito/Cash)
    target_cycle    TEXT CHECK (target_cycle IN ('current', 'previous')),
    month_cycle     SMALLINT,
    year_cycle      SMALLINT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. MONTHLY INCOMES
-- =============================================
CREATE TABLE public.monthly_incomes (
    id_income       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user         UUID REFERENCES auth.users(id) NOT NULL,
    id_card         UUID REFERENCES public.cards(id_card), -- Cuenta donde entra el dinero
    amount_income   DECIMAL(15,2) NOT NULL,
    date_income     DATE DEFAULT CURRENT_DATE,
    notes_income    TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 7. DEBTS (Préstamos)
-- =============================================
CREATE TABLE public.Debts(
    ID_DEBT          UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER          UUID          NOT NULL REFERENCES Users(ID_USER),
    DEBTOR_NAME      VARCHAR(100) NOT NULL,
    DESCRIPTION_DEBT VARCHAR(500) NOT NULL,
    AMOUNT_DEBT      DECIMAL(15,2) NOT NULL,
    AMOUNT_PAID      DECIMAL(15,2) NOT NULL DEFAULT 0,
    DATE_DEBT        DATE          NOT NULL,
    STATUS_DEBT      VARCHAR(10)   NOT NULL DEFAULT 'Pending' CHECK (STATUS_DEBT IN ('Pending', 'Partial', 'Paid')),
    CREATED_AT       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1. Eliminar la restricción de unicidad antigua (si existe) para permitir múltiples ingresos
ALTER TABLE public.monthly_incomes DROP CONSTRAINT IF EXISTS monthly_incomes_id_user_month_income_year_income_key;

-- 2. Agregar las columnas faltantes necesarias para el JS y los Triggers
ALTER TABLE public.monthly_incomes 
ADD COLUMN IF NOT EXISTS date_income DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS id_card UUID REFERENCES public.cards(id_card),
ADD COLUMN IF NOT EXISTS notes_income TEXT;

-- 3. (Opcional) Hacer que month y year sean opcionales si usarás date_income
ALTER TABLE public.monthly_incomes ALTER COLUMN month_income DROP NOT NULL;
ALTER TABLE public.monthly_incomes ALTER COLUMN year_income DROP NOT NULL;

-- 1. Asegurarse de que RLS esté habilitado
ALTER TABLE public.monthly_incomes ENABLE ROW LEVEL SECURITY;

-- 2. Política para INSERT (Permitir a usuarios autenticados registrar ingresos)
DROP POLICY IF EXISTS "Users can insert their own incomes" ON public.monthly_incomes;
CREATE POLICY "Users can insert their own incomes" 
ON public.monthly_incomes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id_user);

-- 3. Política para SELECT (Permitir a usuarios ver solo sus ingresos)
DROP POLICY IF EXISTS "Users can view their own incomes" ON public.monthly_incomes;
CREATE POLICY "Users can view their own incomes" 
ON public.monthly_incomes 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id_user);

CREATE TABLE IF NOT EXISTS public.transfers (
    id_transfer   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    id_from       UUID REFERENCES public.cards(id_card),
    id_to         UUID REFERENCES public.cards(id_card),
    amount        NUMERIC(15,2) NOT NULL,
    date_transfer DATE NOT NULL DEFAULT CURRENT_DATE,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_transfers" ON public.transfers
FOR ALL USING (auth.uid() = id_user);

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS exclude_from_balance BOOLEAN DEFAULT FALSE;