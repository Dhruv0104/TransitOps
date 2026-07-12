/** Currency code → display symbol (prefix) */
export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
}

export function currencySymbol(currencyType = 'INR') {
  return CURRENCY_SYMBOLS[currencyType] || `${currencyType} `
}

/**
 * Format a money amount with the org currency symbol.
 * Uses Indian grouping for INR; otherwise en-US.
 */
export function formatMoney(amount, currencyType = 'INR', options = {}) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'

  const digits = options.digits ?? 2
  const locale = currencyType === 'INR' ? 'en-IN' : 'en-US'
  const formatted = n.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${currencySymbol(currencyType)}${formatted}`
}
