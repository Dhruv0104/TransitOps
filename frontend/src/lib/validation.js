/** Shared client-side form validators */

export function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${label} is required`
  }
  return ''
}

export function email(value, label = 'Email') {
  const msg = required(value, label)
  if (msg) return msg
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
    return `${label} must be a valid email address`
  }
  return ''
}

export function minLength(value, min, label) {
  const msg = required(value, label)
  if (msg) return msg
  if (String(value).trim().length < min) {
    return `${label} must be at least ${min} characters`
  }
  return ''
}

export function positiveNumber(value, label, { allowZero = false } = {}) {
  const msg = required(value, label)
  if (msg) return msg
  const n = Number(value)
  if (Number.isNaN(n)) return `${label} must be a number`
  if (allowZero ? n < 0 : n <= 0) {
    return allowZero
      ? `${label} cannot be negative`
      : `${label} must be greater than 0`
  }
  return ''
}

export function nonNegativeNumber(value, label) {
  return positiveNumber(value, label, { allowZero: true })
}

export function phone(value, label = 'Contact number') {
  const msg = required(value, label)
  if (msg) return msg
  const digits = String(value).replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    return `${label} must be 8–15 digits`
  }
  return ''
}

export function urlOptional(value, label = 'URL') {
  if (!value || !String(value).trim()) return ''
  try {
    // eslint-disable-next-line no-new
    new URL(String(value).trim())
    return ''
  } catch {
    return `${label} must be a valid URL`
  }
}

export function dateRequired(value, label) {
  const msg = required(value, label)
  if (msg) return msg
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return `${label} must be a valid date`
  return ''
}

export function password(value, label = 'Password', { required: isRequired = true, min = 6 } = {}) {
  if (!isRequired && (!value || !String(value).trim())) return ''
  const msg = required(value, label)
  if (msg) return msg
  if (String(value).length < min) {
    return `${label} must be at least ${min} characters`
  }
  return ''
}

/** Collect first error from a list of messages */
export function firstError(...messages) {
  return messages.find(Boolean) || ''
}
