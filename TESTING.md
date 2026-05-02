# Balance Handlers Test Suite

## Descripción
Suite de tests interactivos para validar que `balanceHandlers.js` actualiza correctamente los saldos de las tarjetas cuando se crean, editan y eliminan gastos, ingresos y pagos de tarjeta de crédito.

## Archivos
- **test.html** — Página de interfaz con controles y estadísticas
- **test.js** — Funciones de test que consumen `balanceHandlers.js`
- **TESTING.md** — Este archivo

## Cómo Ejecutar

### 1. Abrir la página de tests
1. Inicia el servidor (si tienes uno) o abre directamente:
   - Ruta local: `file:///path/to/Proyecto_Control_Gastos/test.html`
   - O desde VS Code: botón derecho en `test.html` → "Open with Live Server"

2. Te redirigirá a login si no estás autenticado
3. Una vez autenticado, verás la suite de tests

### 2. Ejecutar Tests Individuales
Cada sección permite:
- **Test Expenses**: Insertar → Editar → Eliminar gastos
- **Test Incomes**: Insertar → Editar → Eliminar ingresos  
- **Test Credit Payments**: Insertar → Eliminar pagos

Cada prueba valida que:
1. El saldo ANTES se captura correctamente
2. La operación se ejecuta (insert/update/delete en BD)
3. Se llama `balanceHandlers` (apply/revert)
4. El saldo DESPUÉS refleja el cambio esperado

### 3. Ejecutar Suite Completa
Botón **▶ Ejecutar Suite Completa** corre todos los tests secuencialmente:
- 3 grupos: Expenses, Incomes, Credit Payments
- Cada grupo: insert → edit → delete
- Total: ~9 operaciones

## Validaciones Principales

### Expenses (Gastos)
- **Debit/Cash**: Monto se **resta** del saldo
  - Ejemplo: Saldo 1000 − 100 = 900
- **Credit**: Monto se **suma** al saldo (deuda)
  - Ejemplo: Saldo 0 + 100 = 100 (deuda)
- **Edit**: Revierte saldo anterior, aplica nuevo impacto
- **Delete**: Revierte saldo completamente

### Incomes (Ingresos)
- Monto siempre se **suma** al saldo
  - Ejemplo: Saldo 500 + 250 = 750
- **Edit**: Revierte ingreso anterior, aplica nuevo monto
- **Delete**: Revierte ingreso completamente

### Credit Payments (Pagos)
- Monto se **resta** de ambas tarjetas:
  - Tarjeta de crédito destino: deuda disminuye
  - Cuenta origen: saldo disminuye
  - Ejemplo: TC deuda 500 − 100 = 400; Débito 1000 − 100 = 900
- **Delete**: Revierte ambos impactos y elimina gasto espejo

## Qué Verificar

✅ **Todo OK si:**
- Estado dice "✓" en verde en cada resultado
- Suite completa muestra "✅ Suite completada: X/X tests exitosos"
- Los deltas (Δ) mostrados coinciden con montos esperados

❌ **Problemas si:**
- Resultados muestran "❌"
- Saldos no cambian o cambian incorrectamente
- Suite completa muestra fallos

## Archivos Relacionados
- `js/balanceHandlers.js` — Lógica de actualización de saldos
- `js/movimientos.js` — Usa `balanceHandlers` en insert
- `js/dashboard.js` — Usa `balanceHandlers` en edit/delete
- `database/drop_triggers.sql` — Script para eliminar triggers (ya ejecutado)

## Preguntas Frecuentes

**P: ¿Qué hago si un test falla?**  
R: Revisa que:
1. Tengas al menos una tarjeta Debit y una Credit
2. Las funciones de `balanceHandlers` se están llamando
3. El ID de tarjeta es correcto
4. La BD está disponible

**P: ¿Los tests afectan datos reales?**  
R: Sí, crean registros en `expenses`, `monthly_incomes`, `credit_card_payments`. Son soft-deletes, así que puedes verlos. Para limpiar:
```sql
DELETE FROM expenses WHERE description_exp LIKE 'Test%';
DELETE FROM monthly_incomes WHERE notes_income LIKE 'Test%';
DELETE FROM credit_card_payments WHERE notes LIKE 'Test%';
```

**P: ¿Puedo correr los tests en paralelo?**  
R: No, la suite actual es secuencial. La interfaz es single-threaded.

---

**Última actualización**: Triggers eliminados. Client-side handlers activos.
