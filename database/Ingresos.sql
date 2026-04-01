-- 1. Agregar columna de tipo
ALTER TABLE categories ADD COLUMN type_cat TEXT DEFAULT 'gasto';

-- 2. Asegurar que solo acepte valores válidos
ALTER TABLE categories ADD CONSTRAINT check_type CHECK (type_cat IN ('gasto', 'ingreso'));

-- 3. Crear un par de categorías de ingreso por defecto para Paulo
INSERT INTO categories (id_user, name_cat, type_cat) 
VALUES 
((SELECT id FROM auth.users LIMIT 1), 'Sueldo', 'ingreso'),
((SELECT id FROM auth.users LIMIT 1), 'Ventas', 'ingreso'),
((SELECT id FROM auth.users LIMIT 1), 'Préstamos', 'ingreso');