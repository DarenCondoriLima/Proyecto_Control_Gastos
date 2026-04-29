# Documentacion del sistema Control de Gastos

Este archivo resume como funciona la aplicacion completa: frontend, autenticacion, tablas de Supabase, procesos principales y triggers.

La idea es que puedas leerlo de arriba a abajo para entender que hace cada parte del sistema y como se conecta con las demas.

## 1. Resumen general

La aplicacion es un sistema web de control financiero personal. Usa:

- HTML + CSS para las vistas.
- JavaScript para toda la logica de negocio en el navegador.
- Supabase Auth para registro, login y sesion.
- Supabase Postgres para guardar usuarios, tarjetas, categorias, gastos, ingresos, transferencias, deudas y presupuestos.
- Triggers en la base de datos para actualizar saldos automaticamente.

El flujo general es este:

1. El usuario se registra o inicia sesion con Supabase Auth.
2. Un trigger crea su perfil en la tabla `Users` y le genera categorias y una cuenta inicial de efectivo.
3. Desde las pantallas del sistema registra gastos, ingresos, transferencias, deudas y pagos de tarjeta.
4. Cada insercion importante actualiza saldos en `Cards`.
5. El dashboard lee varias tablas para mostrar el estado financiero consolidado.

## 2. Capas del proyecto

### Frontend

Los archivos en `html/` son las pantallas, y los de `js/` contienen toda la logica.

Los archivos mas importantes son:

- `js/auth.js`: registro e inicio de sesion.
- `js/dashboard.js`: panel principal con filtros, tabla de movimientos, resumen y ciclo de tarjetas de credito.
- `js/ingresos.js`: registro de ingresos.
- `js/movimientos.js`: registro de gastos y prestamos.
- `js/transferencias.js`: transferencias entre cuentas.
- `js/gestionTarjetas.js` y `js/detalleTarjeta.js`: administracion y detalle de tarjetas.
- `js/categorias.js`: categorias y subcategorias.
- `js/presupuestos.js` y `js/nuevoPresupuesto.js`: planificacion de presupuestos.
- `js/deudores.js`: gestion de deudas/prestamos.
- `js/perfil.js`: perfil de usuario, avatar, estadisticas y datos personales.

### Base de datos

En `database/` hay varios scripts. Importante:

- `scriptSupaBase.sql` representa un esquema mas antiguo.
- `scriptSupaBaseV2.sql` es un esquema mas nuevo y mas cercano al frontend actual.
- `triggers.sql` y `trigsers.json` contienen funciones y triggers para saldos automáticos.

En este proyecto hoy conviven referencias al esquema viejo y al V2. Por eso abajo te indico ambas cosas cuando corresponde.

## 3. Tablas principales y para que sirve cada una

### 3.1 `Users`

Guarda el perfil interno del usuario, separado de Supabase Auth.

Campos relevantes:

- `ID_USER`: identificador interno.
- `NAME_USER`: nombre de usuario corto.
- `FIRSTNAME_USER` y `LASTNAME_USER`: nombre y apellido.
- `ROLE_USER`: rol, por defecto `User`.
- `EMAIL_USER`: correo.
- `PASSWORD_USER`: en el flujo actual se llena con un valor tecnico como `external_auth`.
- `DATEBIRTH_USER`: fecha de nacimiento.
- `IMAGE_USER`: foto de perfil.
- `DELETED_USER`: baja logica.
- `CREATED_AT` y `UPDATED_AT`: auditoria.

Uso:

- Se crea automaticamente al registrarse el usuario.
- `perfil.js` y `dashboard.js` la consultan para mostrar nombre, apellido y datos personales.

### 3.2 `Cards`

Representa las cuentas o medios de pago del usuario.

En `scriptSupaBaseV2.sql` incluye tipos:

- `Cash`
- `Debit`
- `Credit`

Campos relevantes:

- `ID_CARD`: identificador.
- `ID_USER`: propietario.
- `NAME_CARD`: nombre visible.
- `TYPE_CARD`: tipo de cuenta.
- `CURRENCY`: moneda.
- `LIMIT_CARD`: limite de credito, si aplica.
- `CURRENT_BALANCE`: saldo actual o deuda acumulada, segun el tipo.
- `CUTOFF_DAY`: dia de corte para creditos.
- `DUE_DAY`: dia de vencimiento para creditos.
- `DELETED_CARD`: baja logica.

Uso:

- `gestionTarjetas.js` crea, edita y elimina tarjetas.
- `ingresos.js` usa la tarjeta de efectivo o debito donde entra el dinero.
- `movimientos.js` usa una tarjeta para descontar gasto o registrar deuda.
- `transferencias.js` actualiza saldo de origen y destino.
- `detalleTarjeta.js` y `gestionTarjetas.js` calculan deuda, disponible y ciclo de credito.
- `dashboard.js` y `perfil.js` la consultan para estadisticas y resúmenes.

### 3.3 `Categories`

Agrupa los movimientos por tipo de negocio.

Campos relevantes:

- `ID_CAT`: identificador.
- `ID_USER`: usuario dueño.
- `NAME_CAT`: nombre.
- `TYPE_CAT`: `gasto` o `ingreso` en el V2.
- `GLOBAL_CAT`: indica que la categoria base fue creada automaticamente.
- `DELETED_CAT`: baja logica.

Uso:

- `categorias.js` la administra.
- `dashboard.js`, `ingresos.js`, `movimientos.js` y `nuevoPresupuesto.js` la usan para filtrar y registrar datos.
- El trigger `handle_new_user` crea categorias por defecto al registrarse el usuario.

### 3.4 `SubCategories`

Detalle de una categoria.

Campos relevantes:

- `ID_SUBCAT`: identificador.
- `ID_CATEGORY`: categoria padre.
- `ID_USER`: propietario.
- `NAME_SUBCAT`: nombre.
- `DELETED_SUBCAT`: baja logica.

Uso:

- `categorias.js` crea, edita y borra subcategorias.
- `dashboard.js` y `nuevoPresupuesto.js` las usan como filtro o detalle.
- `movimientos.js` las usa para clasificar gastos y prestamos.

### 3.5 `Expenses`

Registro principal de gastos.

Campos relevantes del V2:

- `ID_EXP`: identificador.
- `ID_CATEGORY`: categoria.
- `ID_SUBCAT`: subcategoria.
- `ID_USER`: usuario.
- `ID_CARD`: tarjeta o cuenta usada.
- `DATE_EXP`: fecha.
- `DESCRIPTION_EXP`: descripcion.
- `AMOUNT_EXP`: monto.
- `PAYMENT_METHOD`: `Cash`, `Debit` o `Credit`.
- `INSTALLMENTS`: cantidad de cuotas.
- `INSTALLMENT_AMT`: valor de cada cuota.
- `DELETED_EXP`: baja logica.
- `exclude_from_balance`: bandera para no tocar el saldo.

Uso:

- `movimientos.js` inserta gastos normales.
- `movimientos.js` tambien inserta gastos derivados de prestamos.
- `dashboard.js` muestra la actividad y la tabla de transacciones.
- `perfil.js` cuenta gastos y carga actividad reciente.
- `detalleTarjeta.js` calcula el gasto del ciclo de tarjeta de credito.

### 3.6 `monthly_incomes`

Tabla de ingresos usada por el frontend actual del V2.

Campos relevantes:

- `id_income`: identificador.
- `id_user`: usuario.
- `id_card`: cuenta donde entra el dinero.
- `amount_income`: monto.
- `date_income`: fecha.
- `notes_income`: observaciones.
- `created_at`: auditoria.

Uso:

- `ingresos.js` inserta un ingreso nuevo.
- `dashboard.js` resume ingresos por periodo.
- `perfil.js` cuenta ingresos totales.

Importante:

- La tabla oficial de ingresos en el proyecto es `monthly_incomes`.

### 3.7 `credit_card_payments`

Registro de pagos a tarjetas de credito.

Campos relevantes:

- `id_payment`: identificador.
- `id_user`: usuario.
- `id_card`: tarjeta de credito destino.
- `amount_paid`: monto pagado.
- `date_payment`: fecha.
- `source_account`: cuenta de origen del dinero.
- `target_cycle`: ciclo objetivo, por ejemplo `current` o `previous`.
- `month_cycle` y `year_cycle`: ciclo asignado.
- `notes`: notas.

Uso:

- `detalleTarjeta.js` registra el pago desde la vista de detalle.
- `dashboard.js` lee estos pagos para el resumen del ciclo.
- `gestionTarjetas.js` y `detalleTarjeta.js` usan estos datos para calcular deuda del ciclo actual.

### 3.8 `transfers`

Historial de transferencias entre cuentas.

Campos relevantes:

- `id_transfer`: identificador.
- `id_user`: usuario.
- `id_from`: cuenta origen.
- `id_to`: cuenta destino.
- `amount`: monto.
- `date_transfer`: fecha.
- `notes`: notas.

Uso:

- `transferencias.js` crea el registro.
- El historial de la misma pantalla muestra movimientos entre cuentas.

### 3.9 `Debts`

Deudas o prestamos otorgados por el usuario.

Campos relevantes en el V2:

- `ID_DEBT`: identificador.
- `ID_USER`: usuario.
- `DEBTOR_NAME`: nombre del deudor.
- `DESCRIPTION_DEBT`: descripcion.
- `AMOUNT_DEBT`: monto original.
- `AMOUNT_PAID`: monto ya pagado.
- `DATE_DEBT`: fecha del prestamo.
- `STATUS_DEBT`: `Pending`, `Partial` o `Paid`.
- `CREATED_AT`: auditoria.

Uso:

- `movimientos.js` registra el prestamo real como gasto para impactar saldo.
- `deudores.js` lista, crea, edita y elimina deudas.
- `perfil.js` las cuenta para estadisticas.

### 3.10 `Budgets`

Esta tabla aparece en el esquema viejo y sigue siendo usada por el frontend de presupuestos.

Campos relevantes en el script viejo:

- `ID_BUDGET`
- `ID_USER`
- `NAME_BUDGET`
- `MONTH_BUDGET`
- `YEAR_BUDGET`
- `TOTAL_BUDGET`
- `CURRENCY_BUDGET`
- `DELETED_BUDGET`

Uso:

- `presupuestos.js` y `nuevoPresupuesto.js` la usan para planificar gastos por mes.

## 4. Procesos principales del sistema

### 4.1 Registro de usuario

Archivo: `js/auth.js`

Proceso:

1. El usuario completa registro en el formulario.
2. Se valida fuerza de contraseña.
3. Se revisa si el correo ya existe en `users`.
4. Si no existe, se llama a `supabase.auth.signUp`.
5. Se envian `first_name`, `last_name` y `birth_date` como metadata.
6. Un trigger en Supabase crea el perfil interno y la data inicial.

Tablas involucradas:

- `auth.users`
- `Users`
- `Categories`
- `SubCategories`
- `Cards`

Trigger involucrado:

- `handle_new_user`

### 4.2 Creacion automatica de datos base al registrarse

Trigger: `handle_new_user`

Que hace:

1. Inserta un registro en `Users` con los datos de Auth.
2. Crea categorias por defecto para gastos e ingresos.
3. Crea subcategorias dentro de esas categorias.
4. Crea la tarjeta `Efectivo` con saldo inicial `0`.
5. Crea la categoria `Préstamos Realizados`.

Tablas involucradas:

- `Users`
- `Categories`
- `SubCategories`
- `Cards`

### 4.3 Registro de gastos

Archivo: `js/movimientos.js`

Proceso general:

1. El usuario elige la pestaña de gasto.
2. Selecciona categoria, subcategoria, metodo de pago, tarjeta y monto.
3. El frontend valida saldo disponible si no es credito.
4. Inserta un registro en `Expenses`.
5. El trigger `update_card_balance_on_expense` actualiza `Cards.current_balance`.

Tablas involucradas:

- `Expenses`
- `Cards`
- `Categories`
- `SubCategories`

Trigger involucrado:

- `trg_update_balance_expense` ejecuta `update_card_balance_on_expense`

Regla de saldo:

- Si `PAYMENT_METHOD` es `Cash` o `Debit`, resta el monto de la cuenta.
- Si `PAYMENT_METHOD` es `Credit`, suma el monto a la deuda de la tarjeta.

### 4.4 Registro de ingresos

Archivo: `js/ingresos.js`

Proceso general:

1. El usuario selecciona tipo de ingreso.
2. Si es `Cash`, el sistema usa automaticamente la cuenta de efectivo.
3. Si es `Debit`, muestra selector de tarjetas debito.
4. Se inserta un registro en `monthly_incomes`.
5. El trigger de ingresos incrementa el saldo de la tarjeta destino.

Tablas involucradas:

- `monthly_incomes`
- `Cards`
- `Categories`

Trigger involucrado:

- `trg_update_balance_income`

Importante:

- El frontend actual espera que el ingreso tenga `id_card` no nulo.
- El trigger de V2 esta alineado con `monthly_incomes`.

### 4.5 Transferencias entre cuentas

Archivo: `js/transferencias.js`

Proceso general:

1. El usuario elige una cuenta de origen y una de destino.
2. Se valida que no sean iguales.
3. Se valida que el monto no supere el saldo del origen.
4. Se inserta un registro en `transfers`.
5. El saldo de la cuenta origen se descuenta manualmente.
6. El saldo de la cuenta destino se incrementa manualmente.

Tablas involucradas:

- `transfers`
- `Cards`

Trigger involucrado:

- No hay trigger para este flujo en el codigo actual.

### 4.6 Pagos de tarjeta de credito

Archivo: `js/detalleTarjeta.js` y apoyo en `js/gestionTarjetas.js`

Proceso general:

1. El usuario entra al detalle de una tarjeta de credito.
2. El sistema calcula el ciclo actual usando `cutoff_day` y `due_day`.
3. Se muestran gastos del ciclo, pagos del ciclo, deuda total y disponible.
4. Al registrar un pago, se inserta en `credit_card_payments`.
5. El trigger resta saldo a la tarjeta de credito y a la cuenta de origen si existe.

Tablas involucradas:

- `credit_card_payments`
- `Cards`
- `Expenses`

Trigger involucrado:

- `trg_update_balance_payment` ejecuta `update_balances_on_payment`

Regla de saldo:

- El pago reduce la deuda acumulada de la tarjeta de credito.
- Si hay `source_account`, tambien reduce el saldo de la cuenta desde donde salio el dinero.

### 4.7 Gestion de tarjetas

Archivo: `js/gestionTarjetas.js`

Proceso general:

1. Carga las tarjetas activas del usuario.
2. Permite crear, editar y borrar tarjetas.
3. Si la tarjeta es `Credit`, habilita limite, dia de corte y dia de vencimiento.
4. Para cada tarjeta de credito calcula:
   - deuda actual,
   - disponible,
   - gastos del ciclo,
   - pagos del ciclo,
   - proximo vencimiento.

Tablas involucradas:

- `Cards`
- `Expenses`
- `credit_card_payments`

### 4.8 Dashboard

Archivo: `js/dashboard.js`

El dashboard es la vista mas completa del sistema. Consolida datos de varias tablas y muestra:

- resumen por periodo,
- lista de movimientos,
- filtros por categoria, subcategoria, tarjeta, metodo y fecha,
- busqueda,
- panel de ciclo de tarjeta de credito.

Tablas involucradas:

- `Users`
- `Categories`
- `SubCategories`
- `Cards`
- `Expenses`
- `monthly_incomes`
- `credit_card_payments`
- `Debts`
- `Budgets`

### 4.9 Perfil de usuario

Archivo: `js/perfil.js`

Que muestra:

- nombre y apellido,
- correo,
- foto o avatar generativo,
- rol,
- fecha de nacimiento,
- estadisticas de gastos, ingresos, tarjetas y deudas,
- actividad reciente.

Tablas involucradas:

- `Users`
- `Expenses`
- `monthly_incomes`
- `Cards`
- `Debts`

### 4.10 Categorias y subcategorias

Archivo: `js/categorias.js`

Proceso general:

1. Carga todas las categorias del usuario con sus subcategorias.
2. Separa categorias de gasto e ingreso.
3. Permite crear, editar y borrar categorias.
4. Permite crear, editar y borrar subcategorias.

Tablas involucradas:

- `Categories`
- `SubCategories`

### 4.11 Deudas / prestamos

Archivo: `js/movimientos.js` y `js/deudores.js`

Hay dos niveles:

1. El registro financiero real se hace como gasto en `Expenses` para que el saldo baje.
2. El control del credito prestado se guarda en `Debts`.

Proceso:

1. El usuario registra el prestamo.
2. Se guarda la deuda en `Debts`.
3. Se inserta un gasto en `Expenses` para impactar saldo.
4. El saldo de la cuenta de origen se descuenta por trigger.

Tablas involucradas:

- `Debts`
- `Expenses`
- `Cards`
- `Categories`
- `SubCategories`

## 5. Triggers y funciones importantes

### 5.1 `handle_new_user`

Se dispara al crear un usuario en Auth.

Efecto:

- Crea perfil en `Users`.
- Crea categorias y subcategorias por defecto.
- Crea la tarjeta `Efectivo`.

### 5.2 `update_card_balance_on_expense`

Se dispara `AFTER INSERT` en `Expenses`.

Efecto:

- Si el gasto es `Cash` o `Debit`, resta saldo.
- Si el gasto es `Credit`, suma deuda acumulada en la tarjeta.
- En la version mejorada del trigger, ignora gastos marcados con `exclude_from_balance` o `deleted_exp`.

### 5.3 `update_balance_on_income`

Se dispara `AFTER INSERT` en la tabla de ingresos que use la app.

Efecto:

- Suma el ingreso al `CURRENT_BALANCE` de la tarjeta destino.

Nota:

- En el esquema actual del frontend esto se espera sobre `monthly_incomes`.

### 5.4 `update_balances_on_payment`

Se dispara `AFTER INSERT` en `credit_card_payments`.

Efecto:

- Resta el pago de la tarjeta de credito.
- Si existe `source_account`, tambien descuenta ese dinero de la cuenta origen.

### 5.5 `rls_auto_enable`

Es un event trigger de soporte.

Efecto:

- Intenta habilitar RLS automaticamente cuando se crean tablas nuevas en `public`.

No forma parte del flujo normal de usuario, pero ayuda a mantener la seguridad del esquema.

## 6. Relacion entre paginas, tablas y triggers

### Login y registro

- Pagina: `login.html`
- JS: `auth.js`
- Tablas: `auth.users`, `Users`, `Categories`, `SubCategories`, `Cards`
- Trigger: `handle_new_user`

### Dashboard

- Pagina: `dashboard.html`
- JS: `dashboard.js`
- Tablas: `Users`, `Categories`, `SubCategories`, `Cards`, `Expenses`, `monthly_incomes`, `credit_card_payments`, `Debts`, `Budgets`

### Nuevo ingreso

- Pagina: `nuevoIngreso.html`
- JS: `ingresos.js`
- Tablas: `categories`, `cards`, `monthly_incomes`
- Trigger: `update_balance_on_income`

### Nuevo gasto

- Pagina: `nuevoGasto.html`
- JS: `movimientos.js`
- Tablas: `categories`, `subcategories`, `cards`, `expenses`, `debts`
- Trigger: `update_card_balance_on_expense`

### Transferencias

- Pagina: `transferencia.html`
- JS: `transferencias.js`
- Tablas: `cards`, `transfers`
- Trigger: ninguno

### Gestion de tarjetas

- Pagina: `gestionTarjetas.html`
- JS: `gestionTarjetas.js`
- Tablas: `cards`, `expenses`, `credit_card_payments`
- Trigger: indirecto por pagos y gastos ya guardados

### Detalle de tarjeta

- Pagina: `detalleTarjeta.html`
- JS: `detalleTarjeta.js`
- Tablas: `cards`, `expenses`, `credit_card_payments`
- Trigger: `update_balances_on_payment` cuando se registra un pago

### Categorias

- Pagina: `categoriasYSubCategorias.html`
- JS: `categorias.js`
- Tablas: `categories`, `subcategories`

### Presupuestos

- Pagina: `presupuestos.html` y `nuevoPresupuesto.html`
- JS: `presupuestos.js`, `nuevoPresupuesto.js`
- Tablas: `budgets` y `monthly_incomes`

### Deudores

- Pagina: `deudores.html`
- JS: `deudores.js`
- Tablas: `debts`

### Perfil

- Pagina: `perfil.html`
- JS: `perfil.js`
- Tablas: `Users`, `Expenses`, `monthly_incomes`, `Cards`, `Debts`

## 7. Puntos importantes de consistencia entre scripts

Hay diferencias entre el esquema viejo y el nuevo que conviene conocer:

1. El frontend de presupuestos usa `budgets` como tabla de planificación mensual.
2. `scriptSupaBaseV2.sql` usa `monthly_incomes` y agrega `transfers`.
3. `scriptSupaBaseV2.sql` agrega `exclude_from_balance` en `expenses`, pero ese campo solo tiene efecto real si el trigger versionado lo respeta.
4. Algunas consultas del frontend asumen columnas que no estan en el script V2 completo, por ejemplo referencias a `deleted_debt`.

## 8. Flujo de negocio resumido

1. El usuario se registra.
2. Supabase Auth crea la cuenta.
3. El trigger crea el perfil, categorias base y la cuenta de efectivo.
4. El usuario crea o ajusta sus tarjetas, categorias y presupuestos.
5. Registra gastos o prestamos.
6. Registra ingresos.
7. Hace transferencias entre cuentas.
8. Paga tarjetas de credito.
9. El sistema actualiza saldos y el dashboard consolida todo.

## 9. Conclusiones

La logica central del sistema gira alrededor de `Cards.current_balance`.

- Los gastos descuentan o incrementan deuda segun el metodo de pago.
- Los ingresos aumentan el saldo de la cuenta destino.
- Las transferencias mueven dinero entre cuentas sin trigger.
- Los pagos de credito reducen deuda y descuentan el origen del dinero.

Si quieres entender el sistema completo, la mejor ruta de lectura es:

1. `js/auth.js`
2. `database/crearUsuarioSupabase.sql`
3. `database/scriptSupaBaseV2.sql`
4. `database/triggers.sql`
5. `js/movimientos.js`
6. `js/ingresos.js`
7. `js/transferencias.js`
8. `js/detalleTarjeta.js`
9. `js/dashboard.js`
