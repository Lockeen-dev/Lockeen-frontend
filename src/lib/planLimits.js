export const PLAN_TIERS = {
  FREE: 'free',
  PRO: 'pro',
};

export const PLAN_LIMITS = {
  free: {
    activeDocuments: 1,
    quizGenerationsPerMonth: 5,
    flashcardGenerationsPerMonth: 5,
    aiTutorMessagesPerDay: 20,
  },
  pro: {
    activeDocuments: Infinity,
    quizGenerationsPerMonth: Infinity,
    flashcardGenerationsPerMonth: Infinity,
    aiTutorMessagesPerDay: Infinity,
  },
};

export function getUserPlanTier(user = {}) {
  const raw = String(user.planTier || user.plan || user.subscriptionPlan || PLAN_TIERS.FREE).toLowerCase();
  return raw === PLAN_TIERS.PRO ? PLAN_TIERS.PRO : PLAN_TIERS.FREE;
}

export function getPlanLimits(user = {}) {
  return PLAN_LIMITS[getUserPlanTier(user)] || PLAN_LIMITS.free;
}

export function isFreePlan(user = {}) {
  return getUserPlanTier(user) === PLAN_TIERS.FREE;
}

export function formatLimit(value) {
  return value === Infinity ? 'Unlimited' : String(value);
}
