export function fsize(b: number): string {
  if (!b && b !== 0) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export function money(cur: string | null | undefined, n: number | null | undefined): string {
  if (n == null) return '—';
  const sym: Record<string, string> =
    { EUR: '€', BRL: 'R$', SGD: 'S$', USD: '$', GBP: '£', INR: '₹', CNY: '¥', JPY: '¥' };
  const s = (cur && sym[cur]) || (cur ? cur + ' ' : '$');
  return s + Math.round(n).toLocaleString('en-US');
}

export function k(n: number | null | undefined): string {
  if (!n) return '$0';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

export function num(x: unknown): number | null {
  if (typeof x === 'number') return x;
  if (x == null) return null;
  const n = parseFloat(String(x).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}
