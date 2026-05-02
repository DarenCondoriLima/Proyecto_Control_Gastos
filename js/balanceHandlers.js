import { supabase } from './supabase.js'

async function getCardBalance(id_card) {
  if (!id_card) return { error: 'no-card' }
  const { data, error } = await supabase
    .from('cards')
    .select('current_balance')
    .eq('id_card', id_card)
    .single()

  if (error) return { error }
  return { current_balance: parseFloat(data.current_balance ?? 0) }
}

async function setCardBalance(id_card, newBalance) {
  const { error } = await supabase
    .from('cards')
    .update({ current_balance: newBalance })
    .eq('id_card', id_card)

  return { error }
}

async function updateCardBalanceByDelta(id_card, delta) {
  const card = await getCardBalance(id_card)
  if (card.error) return { error: card.error }
  const newBalance = Number(card.current_balance) + Number(delta)
  return await setCardBalance(id_card, newBalance)
}

export async function applyExpenseImpact(expense) {
  if (!expense) return { error: 'no-expense' }
  if (expense.exclude_from_balance === true) return { ok: true }
  if (expense.deleted_exp === true) return { ok: true }
  if (!expense.id_card) return { ok: true }

  const amount = Number((expense.amount_exp ?? expense.amount) || 0)
  let delta = 0
  if (expense.payment_method === 'Credit') {
    delta = amount // credit payments increase card balance (debt)
  } else {
    // Debit/Cash decrease the account balance
    delta = -amount
  }

  return await updateCardBalanceByDelta(expense.id_card, delta)
}

export async function revertExpenseImpact(oldExpense) {
  if (!oldExpense) return { error: 'no-expense' }
  if (oldExpense.exclude_from_balance === true) return { ok: true }
  if (!oldExpense.id_card) return { ok: true }

  const amount = Number((oldExpense.amount_exp ?? oldExpense.amount) || 0)
  let delta = 0
  if (oldExpense.payment_method === 'Credit') {
    delta = -amount
  } else {
    delta = amount
  }

  return await updateCardBalanceByDelta(oldExpense.id_card, delta)
}

export async function applyIncomeImpact(income) {
  if (!income) return { error: 'no-income' }
  if (!income.id_card) return { ok: true }
  const amount = Number((income.amount_income ?? income.amount) || 0)
  return await updateCardBalanceByDelta(income.id_card, amount)
}

export async function revertIncomeImpact(oldIncome) {
  if (!oldIncome) return { error: 'no-income' }
  if (!oldIncome.id_card) return { ok: true }
  const amount = Number((oldIncome.amount_income ?? oldIncome.amount) || 0)
  return await updateCardBalanceByDelta(oldIncome.id_card, -amount)
}

export async function applyCreditPaymentImpact(payment) {
  if (!payment) return { error: 'no-payment' }
  const amount = Number((payment.amount_paid ?? payment.amount) || 0)

  // 1) Descontar del origen
  if (payment.source_account) {
    const res = await updateCardBalanceByDelta(payment.source_account, -amount)
    if (res && res.error) return res
  }

  // 2) Reducir deuda en tarjeta destino (se descuenta también)
  if (payment.id_card) {
    const res2 = await updateCardBalanceByDelta(payment.id_card, -amount)
    if (res2 && res2.error) return res2
  }

  return { ok: true }
}

export async function revertCreditPaymentImpact(oldPayment) {
  if (!oldPayment) return { error: 'no-payment' }
  const amount = Number((oldPayment.amount_paid ?? oldPayment.amount) || 0)

  if (oldPayment.source_account) {
    const r = await updateCardBalanceByDelta(oldPayment.source_account, amount)
    if (r && r.error) return r
  }

  if (oldPayment.id_card) {
    const r2 = await updateCardBalanceByDelta(oldPayment.id_card, amount)
    if (r2 && r2.error) return r2
  }

  return { ok: true }
}

// Utility: find and revert mirror expense(s) linked to a credit payment
export async function deleteMirrorExpensesByPaymentId(paymentId) {
  if (!paymentId) return { ok: true }
  // Find exact matches by id_credit_payment (preferred)
  const { data, error } = await supabase
    .from('expenses')
    .select('id_exp')
    .eq('id_credit_payment', paymentId)

  if (error) return { error }
  if (!data || data.length === 0) return { ok: true }

  // Mark as deleted (soft-delete) and revert balances for each
  for (const row of data) {
    const { data: expRow, error: e2 } = await supabase
      .from('expenses')
      .select('*')
      .eq('id_exp', row.id_exp)
      .single()

    if (e2) return { error: e2 }

    // revert balance for that expense
    await revertExpenseImpact(expRow)

    // mark deleted_exp true
    await supabase
      .from('expenses')
      .update({ deleted_exp: true })
      .eq('id_exp', row.id_exp)
  }

  return { ok: true }
}

export default {
  applyExpenseImpact,
  revertExpenseImpact,
  applyIncomeImpact,
  revertIncomeImpact,
  applyCreditPaymentImpact,
  revertCreditPaymentImpact,
  deleteMirrorExpensesByPaymentId,
}
