export interface CalcConfig {
  upfrontPercent?: number // 0..1
  months?: number
  feePercent?: number // 0..1
  feeFixedCents?: number
}

export function computeUpfrontMonthly(estimatedBudgetCents: number, cfg: CalcConfig = {}) {
  const p = cfg.upfrontPercent ?? 0.2
  const m = cfg.months ?? 12
  const upfront = Math.round(estimatedBudgetCents * p)
  const remaining = Math.max(estimatedBudgetCents - upfront, 0)
  const monthly = Math.ceil(remaining / m)
  return { upfront, monthly, months: m }
}

export function applyFeeCover(amountCents: number, cfg: CalcConfig = {}) {
  const pct = cfg.feePercent ?? 0.029
  const fixed = cfg.feeFixedCents ?? 30
  return Math.ceil(amountCents * (1 + pct) + fixed)
}



