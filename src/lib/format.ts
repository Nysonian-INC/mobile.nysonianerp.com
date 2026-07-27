/** Shared date / money formatters — keep locale rules in one place. */

/** Compact tenure: "4Y 3M", "10M 24D". Also normalizes legacy "4 yrs 3 mos" strings. */
export function formatTenure(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^\d+[YMD](\s+\d+[YMD])*$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  const years = trimmed.match(/(\d+)\s*y(?:ea)?r?s?/i)?.[1];
  const months = trimmed.match(/(\d+)\s*mo(?:nth)?s?/i)?.[1];
  const days = trimmed.match(/(\d+)\s*d(?:ay)?s?/i)?.[1];
  const parts: string[] = [];
  if (years) parts.push(`${years}Y`);
  if (months) parts.push(`${months}M`);
  if (days) parts.push(`${days}D`);
  return parts.length > 0 ? parts.join(' ') : trimmed;
}

export function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** PHP-style `h:i A d M, Y` — e.g. "02:35 PM 14 Jul, 2026". */
export function formatTimeDayMonthYear(value: string): string {
  if (!value) return '';
  const normalized = value.trim().replace(' ', 'T').replace(/\.\d+$/, '');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (n: number) => String(n).padStart(2, '0');
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(hours)}:${pad(date.getMinutes())} ${ampm} ${pad(date.getDate())} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

export function formatMoney(amount: number, currency = 'PKR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
