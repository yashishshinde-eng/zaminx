export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const STORAGE_KEYS = {
  accessToken: "zaminex.at",
  refreshToken: "zaminex.rt",
  theme: "zaminex.theme",
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
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) => ["users", "list", params ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
} as const;