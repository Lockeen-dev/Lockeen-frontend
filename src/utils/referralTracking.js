const REFERRAL_STORAGE_KEY = 'lockeen-referral-attribution';
const REFERRAL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function cleanReferralCode(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);
}

export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = cleanReferralCode(params.get('ref') || params.get('ambassador') || params.get('partner'));
  if (!code) return null;

  const payload = {
    referralCode: code,
    landingPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    referrer: document.referrer || null,
    capturedAt: Date.now(),
    anonymousId: crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };

  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function readStoredReferral() {
  if (typeof window === 'undefined') return null;
  try {
    const payload = JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || 'null');
    if (!payload?.referralCode || !payload?.capturedAt) return null;
    if (Date.now() - Number(payload.capturedAt) > REFERRAL_MAX_AGE_MS) {
      clearStoredReferral();
      return null;
    }
    return payload;
  } catch {
    clearStoredReferral();
    return null;
  }
}

export function clearStoredReferral() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
