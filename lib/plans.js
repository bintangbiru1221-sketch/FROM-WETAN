// Batasan tiap paket — dipakai untuk validasi di seluruh aplikasi
export const PLANS = {
  trial: {
    label: 'Trial',
    maxGmailAccounts: 1,
    maxContacts: 200,
    autoRotate: false,
    priceMonthly: 0,
  },
  basic: {
    label: 'Basic',
    maxGmailAccounts: 2,
    maxContacts: 3000,
    autoRotate: false,
    priceMonthly: 149000,
  },
  pro: {
    label: 'Pro',
    maxGmailAccounts: 5,
    maxContacts: 20000,
    autoRotate: true,
    priceMonthly: 299000,
  },
};

export function getPlanLimits(planKey) {
  return PLANS[planKey] || PLANS.trial;
}

export function isSubscriptionActive(profile) {
  if (!profile?.plan_expires_at) return false;
  return new Date(profile.plan_expires_at) > new Date();
}
