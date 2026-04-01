-- =============================================
-- ACTIVACIÓN DE RLS Y POLÍTICAS DE SEGURIDAD
-- Solo el dueño de los datos puede verlos/editarlos
-- =============================================

-- 1. Activar RLS en todas las tablas
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE Categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE SubCategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE Expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE Budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE BudgetItems ENABLE ROW LEVEL SECURITY;
ALTER TABLE FixedExpenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE Debts ENABLE ROW LEVEL SECURITY;

-- 2. Crear Políticas (Policies)

-- Ejemplo para la tabla Users: El usuario solo puede ver y editar su propio perfil
CREATE POLICY "Users can view their own profile" 
ON Users FOR SELECT 
USING (auth.uid() = ID_USER);

CREATE POLICY "Users can update their own profile" 
ON Users FOR UPDATE 
USING (auth.uid() = ID_USER);

-- Políticas para las demás tablas (El patrón es el mismo)
-- Usamos "ALL" para simplificar (permite SELECT, INSERT, UPDATE, DELETE)

CREATE POLICY "Users can manage their own cards" 
ON Cards FOR ALL USING (auth.uid() = ID_USER);

CREATE POLICY "Users can manage their own categories" 
ON Categories FOR ALL USING (auth.uid() = ID_USER);

CREATE POLICY "Users can manage their own subcategories" 
ON SubCategories FOR ALL USING (auth.uid() = ID_USER);

CREATE POLICY "Users can manage their own expenses" 
ON Expenses FOR ALL USING (auth.uid() = ID_USER);

CREATE POLICY "Users can manage their own budgets" 
ON Budgets FOR ALL USING (auth.uid() = ID_USER);

CREATE POLICY "Users can manage their own budget items" 
ON BudgetItems FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM Budgets 
        WHERE Budgets.ID_BUDGET = BudgetItems.ID_BUDGET 
        AND Budgets.ID_USER = auth.uid()
    )
);

CREATE POLICY "Users can manage their own fixed expenses" 
ON FixedExpenses FOR ALL USING (auth.uid() = ID_USER);

CREATE POLICY "Users can manage their own debts" 
ON Debts FOR ALL USING (auth.uid() = ID_USER);