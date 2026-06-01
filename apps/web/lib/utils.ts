export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Money / currency ─────────────────────────────────────────────────────────
// Store currency is driven by NEXT_PUBLIC_STORE_CURRENCY (mirrors API STORE_CURRENCY).
// Paystack-supported: GHS | NGN | ZAR | KES | USD.
const SUPPORTED = ['GHS', 'NGN', 'ZAR', 'KES', 'USD'] as const
export type StoreCurrency = (typeof SUPPORTED)[number]

const DEFAULT_LOCALES: Record<StoreCurrency, string> = {
  GHS: 'en-GH', NGN: 'en-NG', ZAR: 'en-ZA', KES: 'en-KE', USD: 'en-US',
}
const SYMBOL: Record<StoreCurrency, string> = {
  GHS: 'GH₵', NGN: '₦', ZAR: 'R', KES: 'KSh', USD: '$',
}

export function getStoreCurrency(): StoreCurrency {
  const raw = (process.env.NEXT_PUBLIC_STORE_CURRENCY ?? 'GHS').toUpperCase() as StoreCurrency
  return (SUPPORTED as readonly string[]).includes(raw) ? raw : 'GHS'
}

export function currencySymbol(c: StoreCurrency = getStoreCurrency()): string {
  return SYMBOL[c]
}

/** Default money formatter: "GH₵ 199.00", "₦ 199.00", etc. */
export function formatPrice(amount: string | number, currency: StoreCurrency = getStoreCurrency()): string {
  return `${SYMBOL[currency]} ${Number(amount).toFixed(2)}`
}

/** Locale-aware formatter (uses Intl.NumberFormat). */
export function formatMoney(amount: string | number, currency: StoreCurrency = getStoreCurrency()): string {
  const locale = process.env.NEXT_PUBLIC_STORE_LOCALE || DEFAULT_LOCALES[currency]
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 })
      .format(Number(amount))
  } catch {
    return formatPrice(amount, currency)
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
