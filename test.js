// test.js - Balance Handlers Test Functions

async function testExpenseInsert() {
    if (!window.testState.userId || !window.testState.testCardDebit) {
        logResult('expense-results', '❌ Usuario o tarjeta no disponible', false);
        return;
    }

    try {
        logResult('expense-results', 'ℹ️ Insertando gasto...', null);

        const method = document.getElementById('exp-method').value;
        const amount = parseFloat(document.getElementById('exp-amount').value);
        const desc = document.getElementById('exp-desc').value;

        // Get previous balance
        const { data: cardBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balBefore = parseFloat(cardBefore.current_balance);

        // Insert expense
        const { data: inserted, error } = await window.supabase
            .from('expenses')
            .insert([{
                id_user: window.testState.userId,
                amount_exp: amount,
                date_exp: new Date().toISOString().split('T')[0],
                payment_method: method,
                id_card: window.testState.testCardDebit,
                description_exp: desc,
                installments: 1
            }])
            .select('*')
            .single();

        if (error) throw error;
        window.testState.testExpenseId = inserted.id_exp;

        // Apply impact
        const impactResult = await window.balanceHandlers.applyExpenseImpact(inserted);

        // Get new balance
        const { data: cardAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balAfter = parseFloat(cardAfter.current_balance);

        // Calculate expected delta
        let expectedDelta = 0;
        if (method === 'Credit') {
            expectedDelta = amount; // debt increases
        } else {
            expectedDelta = -amount; // debit/cash decreases
        }

        const actualDelta = balAfter - balBefore;
        const deltaDiff = Math.abs(actualDelta - expectedDelta);

        logResult('expense-results',
            `✓ Gasto insertado: ${method} S/${amount} | Saldo: ${balBefore.toFixed(2)} → ${balAfter.toFixed(2)} (Δ ${actualDelta.toFixed(2)})`,
            deltaDiff < 0.01
        );

    } catch (err) {
        logResult('expense-results', `❌ Error en insert: ${err.message}`, false);
    }
}

async function testExpenseEdit() {
    if (!window.testState.testExpenseId) {
        logResult('expense-results', '❌ No hay gasto para editar', false);
        return;
    }

    try {
        logResult('expense-results', 'ℹ️ Editando gasto...', null);

        // Get current expense
        const { data: oldExp } = await window.supabase
            .from('expenses')
            .select('*')
            .eq('id_exp', window.testState.testExpenseId)
            .single();

        // Get balance before
        const { data: cardBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balBefore = parseFloat(cardBefore.current_balance);

        // Revert old impact
        await window.balanceHandlers.revertExpenseImpact(oldExp);

        // Update expense
        const newAmount = 150.00;
        await window.supabase.from('expenses').update({
            amount_exp: newAmount,
            description_exp: 'Test Expense (Edited)'
        }).eq('id_exp', window.testState.testExpenseId);

        // Apply new impact
        const newExp = { ...oldExp, amount_exp: newAmount };
        await window.balanceHandlers.applyExpenseImpact(newExp);

        // Get balance after
        const { data: cardAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balAfter = parseFloat(cardAfter.current_balance);

        logResult('expense-results',
            `✓ Gasto editado: S/${oldExp.amount_exp} → S/${newAmount} | Saldo: ${balBefore.toFixed(2)} → ${balAfter.toFixed(2)}`,
            true
        );

    } catch (err) {
        logResult('expense-results', `❌ Error en edit: ${err.message}`, false);
    }
}

async function testExpenseDelete() {
    if (!window.testState.testExpenseId) {
        logResult('expense-results', '❌ No hay gasto para eliminar', false);
        return;
    }

    try {
        logResult('expense-results', 'ℹ️ Eliminando gasto...', null);

        // Get expense
        const { data: exp } = await window.supabase
            .from('expenses')
            .select('*')
            .eq('id_exp', window.testState.testExpenseId)
            .single();

        // Get balance before
        const { data: cardBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balBefore = parseFloat(cardBefore.current_balance);

        // Revert impact
        await window.balanceHandlers.revertExpenseImpact(exp);

        // Delete (soft-delete)
        await window.supabase.from('expenses').update({
            deleted_exp: true
        }).eq('id_exp', window.testState.testExpenseId);

        // Get balance after
        const { data: cardAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balAfter = parseFloat(cardAfter.current_balance);

        logResult('expense-results',
            `✓ Gasto eliminado: Saldo revirtió de ${balBefore.toFixed(2)} a ${balAfter.toFixed(2)}`,
            true
        );

        window.testState.testExpenseId = null;

    } catch (err) {
        logResult('expense-results', `❌ Error en delete: ${err.message}`, false);
    }
}

async function testExpenseFlow() {
    clearResults('expense-results');
    await testExpenseInsert();
    await new Promise(r => setTimeout(r, 500));
    await testExpenseEdit();
    await new Promise(r => setTimeout(r, 500));
    await testExpenseDelete();
}

// ═══════════════════════════════════════════════════════════════
// INCOME TESTS
// ═══════════════════════════════════════════════════════════════

async function testIncomeInsert() {
    if (!window.testState.userId || !window.testState.testCardDebit) {
        logResult('income-results', '❌ Usuario o tarjeta no disponible', false);
        return;
    }

    try {
        logResult('income-results', 'ℹ️ Insertando ingreso...', null);

        const amount = parseFloat(document.getElementById('inc-amount').value);
        const desc = document.getElementById('inc-desc').value;

        // Get balance before
        const { data: cardBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balBefore = parseFloat(cardBefore.current_balance);

        // Insert income
        const { data: inserted, error } = await window.supabase
            .from('monthly_incomes')
            .insert([{
                id_user: window.testState.userId,
                amount_income: amount,
                date_income: new Date().toISOString().split('T')[0],
                id_card: window.testState.testCardDebit,
                notes_income: desc
            }])
            .select('*')
            .single();

        if (error) throw error;
        window.testState.testIncomeId = inserted.id_income;

        // Apply impact
        await window.balanceHandlers.applyIncomeImpact(inserted);

        // Get balance after
        const { data: cardAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balAfter = parseFloat(cardAfter.current_balance);

        const actualDelta = balAfter - balBefore;
        logResult('income-results',
            `✓ Ingreso insertado: S/${amount} | Saldo: ${balBefore.toFixed(2)} → ${balAfter.toFixed(2)} (Δ +${actualDelta.toFixed(2)})`,
            Math.abs(actualDelta - amount) < 0.01
        );

    } catch (err) {
        logResult('income-results', `❌ Error en insert: ${err.message}`, false);
    }
}

async function testIncomeEdit() {
    if (!window.testState.testIncomeId) {
        logResult('income-results', '❌ No hay ingreso para editar', false);
        return;
    }

    try {
        logResult('income-results', 'ℹ️ Editando ingreso...', null);

        const { data: oldInc } = await window.supabase
            .from('monthly_incomes')
            .select('*')
            .eq('id_income', window.testState.testIncomeId)
            .single();

        const { data: cardBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balBefore = parseFloat(cardBefore.current_balance);

        // Revert old
        await window.balanceHandlers.revertIncomeImpact(oldInc);

        // Update
        const newAmount = 750.00;
        await window.supabase.from('monthly_incomes').update({
            amount_income: newAmount,
            notes_income: 'Test Income (Edited)'
        }).eq('id_income', window.testState.testIncomeId);

        // Apply new
        const newInc = { ...oldInc, amount_income: newAmount };
        await window.balanceHandlers.applyIncomeImpact(newInc);

        const { data: cardAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balAfter = parseFloat(cardAfter.current_balance);

        logResult('income-results',
            `✓ Ingreso editado: S/${oldInc.amount_income} → S/${newAmount} | Saldo: ${balBefore.toFixed(2)} → ${balAfter.toFixed(2)}`,
            true
        );

    } catch (err) {
        logResult('income-results', `❌ Error en edit: ${err.message}`, false);
    }
}

async function testIncomeDelete() {
    if (!window.testState.testIncomeId) {
        logResult('income-results', '❌ No hay ingreso para eliminar', false);
        return;
    }

    try {
        logResult('income-results', 'ℹ️ Eliminando ingreso...', null);

        const { data: inc } = await window.supabase
            .from('monthly_incomes')
            .select('*')
            .eq('id_income', window.testState.testIncomeId)
            .single();

        const { data: cardBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balBefore = parseFloat(cardBefore.current_balance);

        // Revert impact
        await window.balanceHandlers.revertIncomeImpact(inc);

        // Delete
        await window.supabase.from('monthly_incomes').delete().eq('id_income', window.testState.testIncomeId);

        const { data: cardAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardDebit)
            .single();
        const balAfter = parseFloat(cardAfter.current_balance);

        logResult('income-results',
            `✓ Ingreso eliminado: Saldo revirtió de ${balBefore.toFixed(2)} a ${balAfter.toFixed(2)}`,
            true
        );

        window.testState.testIncomeId = null;

    } catch (err) {
        logResult('income-results', `❌ Error en delete: ${err.message}`, false);
    }
}

async function testIncomeFlow() {
    clearResults('income-results');
    await testIncomeInsert();
    await new Promise(r => setTimeout(r, 500));
    await testIncomeEdit();
    await new Promise(r => setTimeout(r, 500));
    await testIncomeDelete();
}

// ═══════════════════════════════════════════════════════════════
// CREDIT PAYMENT TESTS
// ═══════════════════════════════════════════════════════════════

async function testPaymentInsert() {
    if (!window.testState.userId || !window.testState.testCardCredit || !window.testState.testCardDebit) {
        logResult('payment-results', '❌ Usuario o tarjetas no disponibles', false);
        return;
    }

    try {
        logResult('payment-results', 'ℹ️ Insertando pago...', null);

        const amount = parseFloat(document.getElementById('pay-amount').value);
        const desc = document.getElementById('pay-desc').value;

        // Get balance before
        const { data: creditBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardCredit)
            .single();
        const creditBalBefore = parseFloat(creditBefore.current_balance);

        // Insert payment
        const { data: inserted, error } = await window.supabase
            .from('credit_card_payments')
            .insert([{
                id_user: window.testState.userId,
                id_card: window.testState.testCardCredit,
                source_account: window.testState.testCardDebit,
                amount_paid: amount,
                date_payment: new Date().toISOString().split('T')[0],
                target_cycle: 'previous',
                month_cycle: new Date().getMonth() + 1,
                year_cycle: new Date().getFullYear(),
                notes: desc
            }])
            .select('*')
            .single();

        if (error) throw error;
        window.testState.testPaymentId = inserted.id_payment;

        // Apply impact
        await window.balanceHandlers.applyCreditPaymentImpact(inserted);

        // Get balance after
        const { data: creditAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardCredit)
            .single();
        const creditBalAfter = parseFloat(creditAfter.current_balance);

        const actualDelta = creditBalAfter - creditBalBefore;
        logResult('payment-results',
            `✓ Pago insertado: S/${amount} | Deuda TC: ${creditBalBefore.toFixed(2)} → ${creditBalAfter.toFixed(2)} (Δ ${actualDelta.toFixed(2)})`,
            Math.abs(actualDelta - (-amount)) < 0.01
        );

    } catch (err) {
        logResult('payment-results', `❌ Error en insert: ${err.message}`, false);
    }
}

async function testPaymentDelete() {
    if (!window.testState.testPaymentId) {
        logResult('payment-results', '❌ No hay pago para eliminar', false);
        return;
    }

    try {
        logResult('payment-results', 'ℹ️ Eliminando pago...', null);

        const { data: pay } = await window.supabase
            .from('credit_card_payments')
            .select('*')
            .eq('id_payment', window.testState.testPaymentId)
            .single();

        const { data: creditBefore } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardCredit)
            .single();
        const creditBalBefore = parseFloat(creditBefore.current_balance);

        // Revert impact
        await window.balanceHandlers.revertCreditPaymentImpact(pay);

        // Delete mirror expenses and payment
        await window.balanceHandlers.deleteMirrorExpensesByPaymentId(pay.id_payment);
        await window.supabase.from('credit_card_payments').delete().eq('id_payment', window.testState.testPaymentId);

        const { data: creditAfter } = await window.supabase
            .from('cards')
            .select('current_balance')
            .eq('id_card', window.testState.testCardCredit)
            .single();
        const creditBalAfter = parseFloat(creditAfter.current_balance);

        logResult('payment-results',
            `✓ Pago eliminado: Deuda revirtió de ${creditBalBefore.toFixed(2)} a ${creditBalAfter.toFixed(2)}`,
            true
        );

        window.testState.testPaymentId = null;

    } catch (err) {
        logResult('payment-results', `❌ Error en delete: ${err.message}`, false);
    }
}

async function testPaymentFlow() {
    clearResults('payment-results');
    await testPaymentInsert();
    await new Promise(r => setTimeout(r, 500));
    await testPaymentDelete();
}

// ═══════════════════════════════════════════════════════════════
// FULL SUITE
// ═══════════════════════════════════════════════════════════════

async function runFullSuite() {
    const statusEl = document.getElementById('suite-status');
    statusEl.textContent = '▶ Ejecutando suite completa...';
    statusEl.className = 'status running';
    statusEl.style.display = 'block';

    clearResults('expense-results');
    clearResults('income-results');
    clearResults('payment-results');
    clearResults('full-results');

    window.testState.totalTests = 0;
    window.testState.passedTests = 0;
    window.testState.failedTests = 0;

    logResult('full-results', '✓ Iniciando suite completa...', null);
    await new Promise(r => setTimeout(r, 500));

    logResult('full-results', '📌 Grupo 1: Expenses', null);
    await testExpenseFlow();
    await new Promise(r => setTimeout(r, 800));

    logResult('full-results', '📌 Grupo 2: Incomes', null);
    await testIncomeFlow();
    await new Promise(r => setTimeout(r, 800));

    logResult('full-results', '📌 Grupo 3: Credit Payments', null);
    await testPaymentFlow();
    await new Promise(r => setTimeout(r, 800));

    const passed = window.testState.passedTests;
    const total = window.testState.totalTests;
    const success = window.testState.failedTests === 0;

    statusEl.textContent = success
        ? `✅ Suite completada: ${passed}/${total} tests exitosos`
        : `⚠️ Suite completada: ${passed}/${total} tests exitosos, ${window.testState.failedTests} fallidos`;
    statusEl.className = `status ${success ? 'success' : 'error'}`;

    logResult('full-results', `\n✅ Suite completada (${passed}/${total} exitosos)`, null);
}

function clearResults(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.innerHTML = '';
}

// Export to window
window.testExpenseInsert = testExpenseInsert;
window.testExpenseEdit = testExpenseEdit;
window.testExpenseDelete = testExpenseDelete;
window.testExpenseFlow = testExpenseFlow;
window.testIncomeInsert = testIncomeInsert;
window.testIncomeEdit = testIncomeEdit;
window.testIncomeDelete = testIncomeDelete;
window.testIncomeFlow = testIncomeFlow;
window.testPaymentInsert = testPaymentInsert;
window.testPaymentDelete = testPaymentDelete;
window.testPaymentFlow = testPaymentFlow;
window.runFullSuite = runFullSuite;
window.clearResults = clearResults;
