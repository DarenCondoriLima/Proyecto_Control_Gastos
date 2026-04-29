-- =============================================
-- DATABASE: ControlPeso (Versión Supabase / Postgres)
-- Tipos de ID: UUID con generación automática
-- =============================================

-- Extensiones necesarias para UUID (Supabase las tiene activas por defecto, pero es buena práctica)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DROP TABLES (Orden de dependencias)
DROP TABLE IF EXISTS Debts;
DROP TABLE IF EXISTS FixedExpenses;
DROP TABLE IF EXISTS BudgetItems;
DROP TABLE IF EXISTS Budgets;
DROP TABLE IF EXISTS Expenses;
DROP TABLE IF EXISTS SubCategories;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Cards;
DROP TABLE IF EXISTS Users;

-- =============================================
-- 1. USERS: Perfiles y credenciales.
-- =============================================
CREATE TABLE Users(
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
-- 2. CARDS: Fuentes de fondos (Crédito/Débito).
-- =============================================
CREATE TABLE Cards(
    ID_CARD      UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER      UUID          NOT NULL REFERENCES Users(ID_USER),
    NAME_CARD    VARCHAR(50)  NOT NULL,
    TYPE_CARD    VARCHAR(10)  NOT NULL CHECK (TYPE_CARD IN ('Debit', 'Credit')),
    CURRENCY     VARCHAR(3)   NOT NULL DEFAULT 'PEN', 
    LIMIT_CARD   DECIMAL(15,2) NULL,
    CUTOFF_DAY   SMALLINT      NULL CHECK (CUTOFF_DAY BETWEEN 1 AND 31),
    DUE_DAY      SMALLINT      NULL CHECK (DUE_DAY BETWEEN 1 AND 31),
    DELETED_CARD BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================
-- 3. CATEGORIES: Grupos principales de gastos.
-- =============================================
CREATE TABLE Categories(
    ID_CAT      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER     UUID         NOT NULL REFERENCES Users(ID_USER),
    NAME_CAT    VARCHAR(50) NOT NULL,
    GLOBAL_CAT  BOOLEAN      NOT NULL DEFAULT FALSE,
    DELETED_CAT BOOLEAN      NOT NULL DEFAULT FALSE,
    CREATED_AT  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. SUBCATEGORIES: Detalle de las categorías.
-- =============================================
CREATE TABLE SubCategories(
    ID_SUBCAT      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_CATEGORY    UUID         NOT NULL REFERENCES Categories(ID_CAT),
    ID_USER        UUID         NOT NULL REFERENCES Users(ID_USER),
    NAME_SUBCAT    VARCHAR(50) NOT NULL,
    GLOBAL_SUBCAT  BOOLEAN      NOT NULL DEFAULT FALSE,
    DELETED_SUBCAT BOOLEAN      NOT NULL DEFAULT FALSE,
    CREATED_AT     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. EXPENSES: Registro de transacciones.
-- =============================================
CREATE TABLE Expenses(
    ID_EXP          UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_CATEGORY     UUID          NOT NULL REFERENCES Categories(ID_CAT),
    ID_SUBCAT       UUID          NOT NULL REFERENCES SubCategories(ID_SUBCAT),
    ID_USER         UUID          NOT NULL REFERENCES Users(ID_USER),
    ID_CARD         UUID          NULL     REFERENCES Cards(ID_CARD),
    DATE_EXP        DATE          NOT NULL,
    DESCRIPTION_EXP VARCHAR(500) NOT NULL,
    AMOUNT_EXP      DECIMAL(15,2) NOT NULL,
    CURRENCY_EXP    VARCHAR(3)   NOT NULL DEFAULT 'PEN',
    PAYMENT_METHOD  VARCHAR(10)  NOT NULL DEFAULT 'Cash'
                    CHECK (PAYMENT_METHOD IN ('Cash', 'Debit', 'Credit')),
    INSTALLMENTS    SMALLINT      NOT NULL DEFAULT 1,
    INSTALLMENT_AMT DECIMAL(15,2) NULL, 
    DELETED_EXP     BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT CHK_CreditNeedsCard CHECK (
        (PAYMENT_METHOD = 'Credit' AND ID_CARD IS NOT NULL) OR (PAYMENT_METHOD <> 'Credit')
    ),
    CONSTRAINT CHK_InstallmentsAmount CHECK (
        (INSTALLMENTS > 1 AND INSTALLMENT_AMT IS NOT NULL) OR (INSTALLMENTS = 1)
    )
);

-- =============================================
-- 6. BUDGETS: Límites mensuales globales.
-- =============================================
CREATE TABLE Budgets(
    ID_BUDGET       UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER         UUID         NOT NULL REFERENCES Users(ID_USER),
    NAME_BUDGET     VARCHAR(75) NOT NULL,
    MONTH_BUDGET    SMALLINT     NOT NULL CHECK (MONTH_BUDGET BETWEEN 1 AND 12),
    YEAR_BUDGET     SMALLINT     NOT NULL,
    TOTAL_BUDGET    DECIMAL(15,2) NOT NULL,
    CURRENCY_BUDGET VARCHAR(3)   NOT NULL DEFAULT 'PEN',
    DELETED_BUDGET  BOOLEAN      NOT NULL DEFAULT FALSE,
    CREATED_AT      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 7. BUDGET ITEMS: Límites por categoría.
-- =============================================
CREATE TABLE BudgetItems(
    ID_ITEM      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_BUDGET    UUID         NOT NULL REFERENCES Budgets(ID_BUDGET),
    ID_CATEGORY  UUID         NOT NULL REFERENCES Categories(ID_CAT),
    LIMIT_ITEM   DECIMAL(15,2) NOT NULL,
    DELETED_ITEM BOOLEAN      NOT NULL DEFAULT FALSE,
    CREATED_AT   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. FIXED EXPENSES: Gastos recurrentes.
-- =============================================
CREATE TABLE FixedExpenses(
    ID_FIXED        UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER         UUID          NOT NULL REFERENCES Users(ID_USER),
    ID_CATEGORY     UUID          NOT NULL REFERENCES Categories(ID_CAT),
    ID_SUBCAT       UUID          NULL     REFERENCES SubCategories(ID_SUBCAT),
    ID_CARD         UUID          NULL     REFERENCES Cards(ID_CARD),
    NAME_FIXED      VARCHAR(100) NOT NULL,
    AMOUNT_FIXED    DECIMAL(15,2) NOT NULL,
    CURRENCY_FIXED  VARCHAR(3)   NOT NULL DEFAULT 'PEN',
    DAY_FIXED       SMALLINT      NOT NULL CHECK (DAY_FIXED BETWEEN 1 AND 31),
    FREQUENCY_FIXED VARCHAR(15)  NOT NULL DEFAULT 'Monthly'
                    CHECK (FREQUENCY_FIXED IN ('Weekly', 'Monthly', 'Yearly')),
    ACTIVE_FIXED    BOOLEAN       NOT NULL DEFAULT TRUE,
    DELETED_FIXED   BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 9. DEBTS: Cuentas por cobrar (Préstamos).
-- =============================================
CREATE TABLE Debts(
    ID_DEBT          UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    ID_USER          UUID          NOT NULL REFERENCES Users(ID_USER),
    DEBTOR_NAME      VARCHAR(100) NOT NULL,
    DESCRIPTION_DEBT VARCHAR(500) NOT NULL,
    AMOUNT_DEBT      DECIMAL(15,2) NOT NULL,
    AMOUNT_PAID      DECIMAL(15,2) NOT NULL DEFAULT 0,
    CURRENCY_DEBT    VARCHAR(3)   NOT NULL DEFAULT 'PEN',
    DATE_DEBT        DATE          NOT NULL,
    DUE_DATE_DEBT    DATE          NULL,
    STATUS_DEBT      VARCHAR(10)  NOT NULL DEFAULT 'Pending'
                     CHECK (STATUS_DEBT IN ('Pending', 'Partial', 'Paid')),
    DELETED_DEBT     BOOLEAN       NOT NULL DEFAULT FALSE,
    CREATED_AT       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 10. MONTHLY_INCOMES: Registro de entradas de dinero.
-- =============================================

CREATE TABLE IF NOT EXISTS monthly_incomes (
    id_income UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES auth.users(id) NOT NULL,
    month_income SMALLINT NOT NULL,
    year_income SMALLINT NOT NULL,
    amount_income DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_user, month_income, year_income) -- Un solo ingreso por mes
);

-- 2. Modificamos o aseguramos que budgets tenga id_category
-- Si ya creaste la tabla, asegúrate de que tenga esta columna:
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS id_category UUID REFERENCES categories(id_cat);


-- Ejecuta esto en tu SQL Editor de Supabase si no existe la columna
ALTER TABLE Budgets ADD COLUMN IF NOT EXISTS id_subcat UUID REFERENCES SubCategories(ID_SUBCAT);

CREATE TABLE public.credit_card_payments (
    id_payment uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    id_user uuid REFERENCES auth.users(id),
    id_card uuid REFERENCES public.cards(id_card),
    amount_paid NUMERIC(15,2) NOT NULL,
    date_payment DATE DEFAULT CURRENT_DATE,
    source_account uuid REFERENCES public.cards(id_card), -- De dónde salió el dinero (Débito)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Habilitar RLS en la tabla de pagos de tarjeta
ALTER TABLE public.credit_card_payments ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para que los usuarios puedan insertar sus propios pagos
CREATE POLICY "Usuarios pueden insertar sus propios pagos" 
ON public.credit_card_payments 
FOR INSERT 
WITH CHECK (auth.uid() = id_user);

-- 3. Crear política para que los usuarios puedan ver sus propios pagos
CREATE POLICY "Usuarios pueden ver sus propios pagos" 
ON public.credit_card_payments 
FOR SELECT 
USING (auth.uid() = id_user);

ALTER TABLE public.credit_card_payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Agregar columnas para identificar el ciclo de facturación al que pertenece el pago
ALTER TABLE public.credit_card_payments 
ADD COLUMN IF NOT EXISTS month_cycle SMALLINT,
ADD COLUMN IF NOT EXISTS year_cycle SMALLINT;

-- Opcional: Agregar una columna de tipo de pago para distinguir abonos de pagos totales
ALTER TABLE public.credit_card_payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('abono', 'total')) DEFAULT 'abono';

-- Comentario para documentar:
COMMENT ON COLUMN public.credit_card_payments.month_cycle IS 'Mes del ciclo de facturación al que se atribuye el pago (1-12)';

-- Agregar columna para definir la atribución del pago
ALTER TABLE public.credit_card_payments 
ADD COLUMN IF NOT EXISTS target_cycle TEXT 
CHECK (target_cycle IN ('current', 'previous')) DEFAULT 'previous';

-- Comentario para recordar la lógica:
-- 'current': El pago se aplica a los gastos realizados HOY (abono anticipado).
-- 'previous': El pago es para el recibo que acaba de cerrar (pago de estado de cuenta).

-- Agregar la columna de saldo actual a la tabla de tarjetas
ALTER TABLE public.Cards 
ADD COLUMN IF NOT EXISTS CURRENT_BALANCE DECIMAL(15,2) DEFAULT 0.00;

-- Comentario para documentación
COMMENT ON COLUMN public.Cards.CURRENT_BALANCE IS 'Saldo real disponible (Débito/Cash) o Deuda acumulada (Crédito)';