CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    cat_id UUID;
BEGIN
    -- 1. Insertar el perfil utilizando la metadata enviada desde el JS
    INSERT INTO public.Users (
        ID_USER, 
        NAME_USER, 
        FIRSTNAME_USER, 
        LASTNAME_USER, 
        EMAIL_USER, 
        PASSWORD_USER, 
        DATEBIRTH_USER,
        ROLE_USER
    )
    VALUES (
        NEW.id, 
        SPLIT_PART(NEW.email, '@', 1), 
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nuevo'), 
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Usuario'), 
        NEW.email, 
        'external_auth', 
        COALESCE((NEW.raw_user_meta_data->>'birth_date')::date, '2000-01-01'), 
        'User'
    );

    -- 2. Compras (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Compras', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Tienda'), (cat_id, NEW.id, 'Ropa'), (cat_id, NEW.id, 'Tecnología'),
    (cat_id, NEW.id, 'Delivery'), (cat_id, NEW.id, 'Comida'), (cat_id, NEW.id, 'Mascotas'), (cat_id, NEW.id, 'S - Otros');

    -- 3. Gastos Fijos (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Gastos Fijos', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Spotify'), (cat_id, NEW.id, 'Gas'), (cat_id, NEW.id, 'Agua'),
    (cat_id, NEW.id, 'Internet'), (cat_id, NEW.id, 'Comida mascotas'), (cat_id, NEW.id, 'Celular'), (cat_id, NEW.id, 'G - Otros');

    -- 4. Formación (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Formación', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Colegio'), (cat_id, NEW.id, 'Material escolar'), (cat_id, NEW.id, 'Libros'),
    (cat_id, NEW.id, 'Excursiones'), (cat_id, NEW.id, 'Cursos'), (cat_id, NEW.id, 'F - Otros');

    -- 5. Ocio (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Ocio', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Vacaciones'), (cat_id, NEW.id, 'Paseos'), (cat_id, NEW.id, 'Juegos'),
    (cat_id, NEW.id, 'Deporte'), (cat_id, NEW.id, 'Restaurantes'), (cat_id, NEW.id, 'Bares'), (cat_id, NEW.id, 'O - Otros');

    -- 6. Transporte (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Transporte', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Taxi'), (cat_id, NEW.id, 'Combi'), (cat_id, NEW.id, 'Trabajo'),
    (cat_id, NEW.id, 'Estudio'), (cat_id, NEW.id, 'T - Otros');

    -- 7. Vivienda (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Vivienda', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Casa'), (cat_id, NEW.id, 'Electrodomésticos'), (cat_id, NEW.id, 'Reparaciones'),
    (cat_id, NEW.id, 'Muebles'), (cat_id, NEW.id, 'Decoración'), (cat_id, NEW.id, 'Limpieza'), (cat_id, NEW.id, 'V - Otros');

    -- 8. Salud (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Salud', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Obra Social'), (cat_id, NEW.id, 'Farmacia'), (cat_id, NEW.id, 'Cuidado Personal'),
    (cat_id, NEW.id, 'Gimnasio'), (cat_id, NEW.id, 'Sa - Otros');

    -- 9. Seguros (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Seguros', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Vivienda'), (cat_id, NEW.id, 'Jubilación'), (cat_id, NEW.id, 'Vehículo'),
    (cat_id, NEW.id, 'Vida'), (cat_id, NEW.id, 'Se - Otros');

    -- 10. Impuestos (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Impuestos', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'ABL'), (cat_id, NEW.id, 'Ingresos Brutos'), (cat_id, NEW.id, 'Riqueza'),
    (cat_id, NEW.id, 'Ganancias'), (cat_id, NEW.id, 'I - Otros');

    -- 11. INGRESOS (Nueva sección obligatoria)
    -- Insertamos categorías que Paulo verá en nuevoIngreso.html
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Sueldo', TRUE, 'ingreso');
    
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Ventas', TRUE, 'ingreso');
    
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Otros Ingresos', TRUE, 'ingreso');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;