/**
 * Type-safe translation keys for the BuildBase SDK.
 * All user-facing strings are defined here.
 */

export interface SDKMessages {
  security: {
    connectedAgentsTitle: string;
    connectedAgentsDescription: string;
    connectedAgentsDisconnect: string;
    connectedAgentsEmpty: string;
    connectedAgentsAccess: string;
    connectedAgentsGranted: string;
    inactive: string;
    inactiveHint: string;
    passkeysTitle: string;
    passkeysDescription: string;
    noPasskeys: string;
    addHint: string;
    rename: string;
    remove: string;
    removeTitle: string;
    removeDescription: string;
    renamePlaceholder: string;
    lastUsed: string;
    added: string;
  };
  settings: {
    titles: {
      profile: string;
      security: string;
      general: string;
      users: string;
      subscription: string;
      usage: string;
      credits: string;
      features: string;
      notifications: string;
      permissions: string;
      danger: string;
    };
    sidebar: {
      account: string;
      workspace: string;
      profile: string;
      security: string;
      general: string;
      users: string;
      subscription: string;
      usage: string;
      credits: string;
      features: string;
      notifications: string;
      permissions: string;
      danger: string;
    };
    common: {
      refresh: string;
      refreshing: string;
      retry: string;
      retrying: string;
      save: string;
      saving: string;
      cancel: string;
      delete: string;
      dismiss: string;
      loading: string;
      success: string;
      error: string;
      refreshAction: string;
      retryAction: string;
      noPermissionTitle: string;
      noPermissionDescription: string;
      billingManageOnly: string;
      openSettings: string;
      back: string;
    };
  };
  subscription: {
    managePlan: string;
    changePlan: string;
    viewPricingPlans: string;
    viewPlans: string;
    upgradePlan: string;
    subscribe: string;
    currentPlan: string;
    noSubscription: string;
    choosePlan: string;
    choosePlanDescription: string;
    forWorkspace: string;
    planUpdateAvailable: string;
    updateSuccess: string;
    updateFailed: string;
    cancelTitle: string;
    cancelConfirm: string;
    cancelKeep: string;
    cancelButton: string;
    canceling: string;
    cancelSuccess: string;
    cancelNotCharged: string;
    cancelResumeAnytime: string;
    cancelTrialTitle: string;
    cancelTrialConfirm: string;
    cancelTrialAccess: string;
    cancelTrialNoCharge: string;
    cancelTrialResume: string;
    cancelTrialKeep: string;
    cancelTrialButton: string;
    resumeTitle: string;
    resumeTrial: string;
    resumeConfirm: string;
    resumeKeep: string;
    resumeButton: string;
    resuming: string;
    resumeSuccess: string;
    managePayment: string;
    openingPortal: string;
    viewAllPlans: string;
    scheduledCancellation: string;
    scheduledTrialCancellation: string;
    paymentPastDue: string;
    paymentPastDueDescription: string;
    subscriptionPaused: string;
    subscriptionPausedDescription: string;
    errorLoading: string;
    errorLoadingDescription: string;
    errorProcessing: string;
    errorCanceling: string;
    errorResuming: string;
    invalidWorkspace: string;
    billingInterval: {
      monthly: string;
      quarterly: string;
      yearly: string;
      perMonth: string;
      perQuarter: string;
      perYear: string;
    };
    seats: {
      title: string;
      members: string;
      included: string;
      billable: string;
      perExtraSeat: string;
      limit: string;
      includedSeats: string;
      maxSeats: string;
      freeWithBase: string;
      allIncluded: string;
      extra: string;
      unlimited: string;
    };
    items: {
      features: string;
      limits: string;
      quotas: string;
      credits: string;
      creditsPerMonth: string;
      creditsOneTime: string;
      creditRenewal: string;
      creditModeReset: string;
      creditModeTopup: string;
      creditModeLifetime: string;
      /** @deprecated */
      creditsPerPeriod: string;
      /** @deprecated */
      creditRollover: string;
    };
    checkout: {
      upgrade: string;
      downgrade: string;
      switchTo: string;
      select: string;
    };
    status: {
      active: string;
      canceling: string;
      trial: string;
      canceled: string;
      pastDue: string;
      paused: string;
      deprecated: string;
      unknown: string;
    };
    plan: string;
    invoicesTab: string;
    changePlanButton: string;
    noPlanAssigned: string;
    free: string;
    perSeatDisplay: string;
    estTotalDisplay: string;
    nextBillingDisplay: string;
    membersInWorkspace: string;
    billingInCurrency: string;
    savingsPercent: string;
    switchToInterval: string;
    seatPriceDisplay: string;
    trialEnded: string;
    trialEndsIn: string;
    onTrial: string;
    upgradeToKeepAccess: string;
    viewInvoices: string;
    cancelTrial: string;
    dunningFinal: string;
    dunningSuspended: string;
    dunningRecovery: string;
    dunningSuspendedDescription: string;
    dunningRecoveryDescription: string;
    cancelEndDescription: string;
    trialEndDescription: string;
    cancelEndFallback: string;
    resumeChargeDate: string;
    resumeChargeFallback: string;
    resumeContinue: string;
    resumeCancelAnytime: string;
    retainAccess: string;
    retainAccessFallback: string;
    noPlansAvailable: string;
    noPlansAvailableHint: string;
    startTrialDescription: string;
    noSubscriptionDescription: string;
    startFreeTrial: string;
    startTrialDays: string;
    trialBadge: string;
  };
  users: {
    title: string;
    adminOnly: string;
    inviteByEmail: string;
    inviteButton: string;
    inviting: string;
    inviteSuccess: string;
    emailRequired: string;
    invalidEmail: string;
    inviteFailed: string;
    seatLimitReached: string;
    memberLimitReached: string;
    role: string;
    you: string;
    owner: string;
    noMembers: string;
    extraSeatCost: string;
    unknownUser: string;
    seats: string;
    members: string;
    included: string;
    perExtraSeat: string;
    maxMembers: string;
    available: string;
    noMemberLimit: string;
    seatHeading: string;
    limitReached: string;
    memberCount: string;
    subscriptionRequired: string;
    seatLimitMessage: string;
    settingsLimitMessage: string;
    memberLimitMessage: string;
    selectRole: string;
    inviteAs: string;
  };
  invoices: {
    title: string;
    description: string;
    pay: string;
    view: string;
    viewDetails: string;
    download: string;
    errorLoading: string;
    noInvoices: string;
    noInvoicesWithSub: string;
    paidAmount: string;
    na: string;
    status: {
      draft: string;
      open: string;
      paid: string;
      uncollectible: string;
      void: string;
    };
  };
  usage: {
    title: string;
    description: string;
    totalResources: string;
    overallUsage: string;
    inOverage: string;
    estOverageCost: string;
    overageDetected: string;
    overageDescription: string;
    overageUnits: string;
    rate: string;
    billableBlocks: string;
    estimatedCharge: string;
    noData: string;
    noDataHint: string;
    used: string;
    remaining: string;
    overLimit: string;
    percentUsed: string;
    availableRemaining: string;
    overLimitCount: string;
    overageWarning: string;
    fullyUsed: string;
    renewingSoon: string;
    almostFull: string;
    overage: string;
    errorLoading: string;
    perUnit: string;
    perUnits: string;
    rateDisplay: string;
    resourcesExceeded: string;
    estOverageCharges: string;
    overageRateDisplay: string;
    resetDateDisplay: string;
    daysRemainingDisplay: string;
  };
  profile: {
    email: string;
    name: string;
    language: string;
    country: string;
    currency: string;
    timezone: string;
    profileImage: string;
    success: string;
    nameMinLength: string;
    save: string;
    reset: string;
  };
  general: {
    ownerOnly: string;
    name: string;
    namePlaceholder: string;
    nameMinLength: string;
    billingCurrency: string;
    icon: string;
    iconDescription: string;
    imageUrl: string;
    imageUrlPlaceholder: string;
    imageUrlDescription: string;
    previewLabel: string;
    success: string;
    chooseEmoji: string;
    customImageUrl: string;
    updateWorkspace: string;
  };
  features: {
    title: string;
    ownerOnly: string;
    noFeatures: string;
    enabled: string;
    disabled: string;
    enabling: string;
    disabling: string;
    featureSuccess: string;
    updateSuccess: string;
    actionStatus: string;
  };
  danger: {
    title: string;
    adminOnly: string;
    deleteWorkspace: string;
    deleteConfirm: string;
    deleteWarning: string;
    deleting: string;
    deleteDescription: string;
    deleteConfirmDescription: string;
    failedToDelete: string;
  };
  notifications: {
    title: string;
    permissionDenied: string;
    notSupported: string;
    manageDescription: string;
    blocked: string;
    blockedDescription: string;
    pushTitle: string;
    pushEnabledDescription: string;
    pushDisabledDescription: string;
    enabling: string;
    disabling: string;
    enable: string;
    disable: string;
    toggleAction: string;
    pushDescription: string;
    deviceNote: string;
    prefsSaved: string;
    loadingPrefs: string;
    categories: {
      workspace: string;
      billing: string;
    };
    events: {
      workspace_invite: string;
      workspace_invite_desc: string;
      workspace_removed: string;
      workspace_removed_desc: string;
      workspace_role_changed: string;
      workspace_role_changed_desc: string;
      subscription_created: string;
      subscription_created_desc: string;
      subscription_upgraded: string;
      subscription_upgraded_desc: string;
      subscription_canceled: string;
      subscription_canceled_desc: string;
      subscription_suspended: string;
      subscription_suspended_desc: string;
      trial_ending: string;
      trial_ending_desc: string;
      trial_expired: string;
      trial_expired_desc: string;
      payment_failed: string;
      payment_failed_desc: string;
      payment_action_required: string;
      payment_action_required_desc: string;
      payment_succeeded: string;
      payment_succeeded_desc: string;
    };
    unblock: {
      firefox: { step1: string; step2: string; step3: string; step4: string };
      safari: { step1: string; step2: string; step3: string; step4: string };
      edge: { step1: string; step2: string; step3: string; step4: string };
      chrome: { step1: string; step2: string; step3: string; step4: string };
    };
  };
  quota: {
    includedOnly: string;
    includedWithOverage: string;
    includedHardLimit: string;
    unitFallback: string;
  };
  pricing: {
    title: string;
    description: string;
    currency: string;
    billingIn: string;
    noPlansCurrency: string;
    noPlansCurrencyHint: string;
    noPlans: string;
    free: string;
    included: string;
    save: string;
    current: string;
    processing: string;
    unavailable: string;
    selectCurrency: string;
    billingInterval: string;
  };
  beta: {
    nameLabel: string;
    emailLabel: string;
    submitText: string;
    submittingText: string;
    errorMessage: string;
    tryAgain: string;
    privacyConsent: string;
    privacyPolicy: string;
    and: string;
    termsOfService: string;
  };
  workspace: {
    switchTitle: string;
    switchDescription: string;
    notLoggedIn: string;
    availableWorkspaces: string;
    loadingWorkspaces: string;
    searchPlaceholder: string;
    noWorkspacesFound: string;
    noWorkspacesAvailable: string;
    switchTo: string;
    membersCount: string;
    createNew: string;
    createTitle: string;
    createDescription: string;
    workspaceName: string;
    workspaceNamePlaceholder: string;
    workspaceNameMinLength: string;
    workspaceIcon: string;
    iconDescription: string;
    chooseEmoji: string;
    customImageUrl: string;
    imageUrl: string;
    imageUrlPlaceholder: string;
    imageUrlDescription: string;
    invalidUrl: string;
    creating: string;
    createWorkspace: string;
  };
  dropdowns: {
    search: string;
    chooseOption: string;
    chooseCountry: string;
    searchCountry: string;
    chooseLanguage: string;
    searchLanguage: string;
    chooseCurrency: string;
    searchCurrency: string;
    chooseTimezone: string;
    searchTimezone: string;
  };
  push: {
    failedToSubscribe: string;
    failedToUnsubscribe: string;
  };
  permissions: {
    title: string;
    description: string;
    ownerOnly: string;
    save: string;
    saving: string;
    saveSuccess: string;
  };
  credits: {
    title: string;
    description: string;
    balance: string;
    available: string;
    totalGranted: string;
    totalConsumed: string;
    totalExpired: string;
    noCredits: string;
    noCreditsHint: string;
    buyCredits: string;
    buyAmount: string;
    purchasing: string;
    packages: string;
    noPackages: string;
    creditsAmount: string;
    validityDays: string;
    validityUnlimited: string;
    transactions: string;
    noTransactions: string;
    loadMore: string;
    viewAll: string;
    expiringSoon: string;
    expiringInDays: string;
    noExpiring: string;
    type: {
      plan_grant: string;
      pack_purchased: string;
      consumed: string;
      expired: string;
      admin_grant: string;
      admin_revoke: string;
      refund: string;
    };
    dialogTitle: string;
    dialogDescription: string;
    dialogDescriptionWorkspace: string;
    perCredit: string;
    purchaseSuccess: string;
    purchaseCanceled: string;
    purchaseFailed: string;
    errorLoading: string;
    insufficientCredits: string;
  };
  loading: {
    restoringSession: string;
    redirecting: string;
    signingIn: string;
    verifyingAccount: string;
    almostThere: string;
  };
  errors: {
    networkError: string;
    unauthorized: string;
    notFound: string;
    generic: string;
    fetchPlans: string;
    fetchPlanGroup: string;
    fetchPlanGroupVersion: string;
    fetchPlanGroupVersions: string;
    fetchSubscription: string;
    createCheckout: string;
    updateSubscription: string;
    fetchInvoices: string;
    fetchInvoice: string;
    openBillingPortal: string;
    cancelSubscription: string;
    resumeSubscription: string;
    recordUsage: string;
    fetchQuotaUsage: string;
    fetchAllQuotaUsage: string;
    fetchUsageLogs: string;
    fetchCreditBalance: string;
    consumeCredits: string;
    purchaseCredits: string;
    fetchCreditPackages: string;
    fetchCreditTransactions: string;
    fetchExpiringCredits: string;
  };
}

/** Supported locale codes */
export type SDKLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi' | 'ar';

/** Recursively optional version of a message tree (leaves stay strings) */
type DeepPartialMessages<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartialMessages<T[K]>;
};

/**
 * Per-key overrides for SDK UI strings — any subset of the SDKMessages tree.
 * Deep-merged over the active locale bundle by the translation provider.
 */
export type PartialSDKMessages = DeepPartialMessages<SDKMessages>;

// ─── Type-safe Translation Keys ─────────────────────────────────────────────

/**
 * Generates a union of all valid dot-separated key paths from SDKMessages.
 * Supports up to 4 levels of nesting (covers all current keys, e.g.
 * "notifications.unblock.firefox.step1").
 * Used to make `t()` calls compile-time safe with autocomplete.
 *
 * @example
 * TranslationKey → "settings.titles.profile" | "settings.common.refresh" | ...
 */
type Level1 = keyof SDKMessages & string;
type Level2 = {
  [K1 in Level1]: SDKMessages[K1] extends Record<string, unknown>
    ? `${K1}.${keyof SDKMessages[K1] & string}`
    : never;
}[Level1];
type Level3 = {
  [K1 in Level1]: SDKMessages[K1] extends Record<string, unknown>
    ? {
        [K2 in keyof SDKMessages[K1] & string]: SDKMessages[K1][K2] extends Record<string, unknown>
          ? `${K1}.${K2}.${keyof SDKMessages[K1][K2] & string}`
          : never;
      }[keyof SDKMessages[K1] & string]
    : never;
}[Level1];

type Level4 = {
  [K1 in Level1]: SDKMessages[K1] extends Record<string, unknown>
    ? {
        [K2 in keyof SDKMessages[K1] & string]: SDKMessages[K1][K2] extends Record<string, unknown>
          ? {
              [K3 in keyof SDKMessages[K1][K2] & string]: SDKMessages[K1][K2][K3] extends Record<
                string,
                unknown
              >
                ? `${K1}.${K2}.${K3}.${keyof SDKMessages[K1][K2][K3] & string}`
                : never;
            }[keyof SDKMessages[K1][K2] & string]
          : never;
      }[keyof SDKMessages[K1] & string]
    : never;
}[Level1];

/** Union of all valid translation key paths (e.g. "settings.titles.profile") */
export type TranslationKey = Level2 | Level3 | Level4;
