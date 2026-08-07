export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const STORAGE_KEYS = {
  accessToken: "zeminex.at",
  refreshToken: "zeminex.rt",
  theme: "zeminex.theme",
  sidebarCollapsed: "zeminex.sidebar.collapsed",
  onboardingDismissed: "zeminex.onboarding.dismissed",
} as const;

/** Centralised TanStack Query key factory. */
export const queryKeys = {
  me: ["auth", "me"] as const,
  dashboard: ["dashboard", "summary"] as const,
  packages: {
    catalog: ["packages", "catalog"] as const,
    mine: ["packages", "mine"] as const,
  },
  wallet: {
    balance: ["wallet", "balance"] as const,
    ledger: (params?: unknown) => ["wallet", "ledger", params ?? {}] as const,
  },
  withdrawals: {
    list: (params?: unknown) => ["withdrawals", "list", params ?? {}] as const,
    detail: (id: string) => ["withdrawals", "detail", id] as const,
  },
  referrals: {
    stats: ["referrals", "stats"] as const,
    direct: (params?: unknown) => ["referrals", "direct", params ?? {}] as const,
    children: (id: string, params?: unknown) => ["referrals", "children", id, params ?? {}] as const,
  },
  bonanzas: {
    overview: ["bonanzas", "overview"] as const,
    list: (params?: unknown) => ["bonanzas", "admin-list", params ?? {}] as const,
    detail: (id: string) => ["bonanzas", "admin-detail", id] as const,
  },
  reports: {
    list: (kind: string, params?: unknown) => ["reports", kind, params ?? {}] as const,
  },
  adminReports: {
    list: (kind: string, params?: unknown) => ["admin-reports", kind, params ?? {}] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) => ["users", "list", params ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  // Admin-only namespaces (Phase 14A). Kept separate from the user-scoped
  // `users` keys above to avoid cache collisions.
  adminDashboard: ["admin", "dashboard"] as const,
  adminUsers: {
    list: (params?: unknown) => ["admin", "users", "list", params ?? {}] as const,
    detail: (id: string) => ["admin", "users", "detail", id] as const,
  },
  compensationSettings: ["admin", "compensation-settings"] as const,
  // Phase 14B content & config.
  adminCmsPages: {
    list: (params?: unknown) => ["admin", "cms-pages", "list", params ?? {}] as const,
    detail: (slug: string) => ["admin", "cms-pages", "detail", slug] as const,
  },
  adminSiteConfig: ["admin", "site-config"] as const,
  smtpSettings: ["admin", "smtp-settings"] as const,
  nowpaymentsSettings: ["admin", "nowpayments-settings"] as const,
  // Phase 14C operations.
  adminMaintenance: ["admin", "maintenance"] as const,
  adminLogs: (params: unknown) => ["admin", "logs", params] as const,
} as const;