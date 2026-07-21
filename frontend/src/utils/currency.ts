const currencyAliases: Record<string, string> = {
  RM: 'MYR',
  MYR: 'MYR',
  'MALAYSIAN RINGGIT': 'MYR',
  'RINGGIT MALAYSIA': 'MYR',
  '$': 'USD',
  USD: 'USD',
  'US$': 'USD',
  'US DOLLAR': 'USD',
  'US DOLLARS': 'USD',
  '€': 'EUR',
  EUR: 'EUR',
  EURO: 'EUR',
  '£': 'GBP',
  GBP: 'GBP',
  'POUND STERLING': 'GBP',
  'S$': 'SGD',
  SGD: 'SGD',
  'A$': 'AUD',
  AUD: 'AUD',
  'C$': 'CAD',
  CAD: 'CAD',
};

/** Converts legacy aliases and user input to an ISO 4217 currency code. */
export function normalizeCurrency(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase();
  return normalized ? currencyAliases[normalized] ?? normalized : null;
}

/** Keeps MYR familiar to Malaysian users while other currencies use ISO labels. */
export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const canonical = normalizeCurrency(currency);
  const label = canonical === 'MYR' ? 'RM' : canonical;
  return `${label ? `${label} ` : ''}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function isSameCurrency(left: string | null | undefined, right: string | null | undefined): boolean {
  return normalizeCurrency(left) === normalizeCurrency(right);
}
