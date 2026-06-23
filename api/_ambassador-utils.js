import { getJsonBody, getSupabaseAdmin, json, requireAuthenticatedUser } from './_billing-utils.js';

export const COMMISSION_CENTS = 200;
export const PAYOUT_THRESHOLD_CENTS = 2000;

export function cleanText(value = '', maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

export function normalizeEmail(value = '') {
  return cleanText(value, 320).toLowerCase();
}

export function normalizeReferralCode(value = '') {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function makeReferralCode(parts = []) {
  const base = normalizeReferralCode(parts.filter(Boolean).join('-')) || `amb-${Math.random().toString(36).slice(2, 8)}`;
  return base.length >= 4 ? base : `${base}-lockeen`;
}

export function centsToEuro(cents = 0) {
  return Math.round(Number(cents || 0)) / 100;
}

export function isAdminUser(user = {}) {
  const app = user.app_metadata || {};
  const email = normalizeEmail(user.email);
  const envAdmins = String(process.env.LOCKEEN_ADMIN_EMAILS || 'support.lockeen@gmail.com')
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  return Boolean(
    app.is_admin ||
    app.admin ||
    app.lockeen_role === 'admin' ||
    app.role === 'admin' ||
    (email && envAdmins.includes(email)),
  );
}

export async function requireAdminUser(req) {
  const authResult = await requireAuthenticatedUser(req, 'Admin');
  if (authResult.error) return authResult;

  if (!isAdminUser(authResult.data.user)) {
    return {
      data: null,
      error: { code: 'ADMIN_REQUIRED', message: 'Admin access is required.' },
    };
  }

  return authResult;
}

export function getAdminClient() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      data: null,
      error: { code: 'SUPABASE_SERVICE_ROLE_MISSING', message: 'Supabase service role key is required.' },
    };
  }
  return { data: admin, error: null };
}

export async function readJson(req) {
  return getJsonBody(req);
}

export function sendError(res, status, error) {
  return json(res, status, { error });
}

export function maskEmail(email = '') {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) return 'student';
  return `${name.slice(0, 2)}***@${domain}`;
}

export function summarizeMoney(commissions = [], payouts = []) {
  const totals = commissions.reduce((acc, item) => {
    const amount = Number(item.amount_cents || 0);
    acc.lifetime += amount;
    if (item.status === 'pending') acc.pending += amount;
    if (item.status === 'available') acc.available += amount;
    if (item.status === 'paid') acc.paid += amount;
    if (item.status === 'reversed') acc.reversed += amount;
    return acc;
  }, { lifetime: 0, pending: 0, available: 0, paid: 0, reversed: 0 });

  const requested = payouts
    .filter((item) => item.status === 'requested' || item.status === 'approved')
    .reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);

  return {
    ...totals,
    requested,
    payoutReady: totals.available >= PAYOUT_THRESHOLD_CENTS,
    threshold: PAYOUT_THRESHOLD_CENTS,
  };
}
