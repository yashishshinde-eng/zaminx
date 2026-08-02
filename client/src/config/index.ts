export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export const STORAGE_KEYS = {
  accessToken: "zaminex.at",
  refreshToken: "zaminex.rt",
  theme: "zaminex.theme",
} as const;

/** Centralised TanStack Query key factory. */
export const queryKeys = {
  me: ["auth", "me"] as const,
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) => ["users", "list", params ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
} as const;