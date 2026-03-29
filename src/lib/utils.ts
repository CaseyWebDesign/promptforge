export function generateId(): string {
  return crypto.randomUUID();
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'pf_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function now(): number {
  return Date.now();
}

export function startOfDay(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export const FREE_DAILY_LIMIT = 3;
export const PAID_DAILY_LIMIT = 1000;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
