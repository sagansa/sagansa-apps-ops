/**
 * Format a number as IDR currency, fully expanded (e.g. "Rp 1.234.567").
 */
export function formatCurrency(value: number, locale: string = 'id-ID'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

/**
 * Compact currency for tight spaces (KPI/stat cards, chart axis).
 *   1.500.000  -> "Rp 1,5M"
 *   1.234.567  -> "Rp 1,2M"
 *   850.000    -> "Rp 850K"
 *   2.300.000.000 -> "Rp 2,3B"
 */
export function formatCompactCurrency(value: number, locale: string = 'id-ID'): string {
  const abs = Math.abs(Number.isFinite(value) ? value : 0);
  const sign = value < 0 ? '-' : '';
  const prefix = locale === 'en' ? 'Rp ' : 'Rp ';

  if (abs >= 1_000_000_000) return `${prefix}${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${sign}${(abs / 1_000).toFixed(0)}K`;
  return formatCurrency(value, locale);
}
