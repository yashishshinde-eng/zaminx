import { api } from "./axios";
import type { PackageTier, UserPackageRow } from "@zaminex/shared";

interface ListResponse<T> {
  data: { packages: T[] };
}
interface OneResponse {
  data: { package: UserPackageRow };
}

/** GET /packages — active catalog. */
export async function fetchPackageCatalog(): Promise<PackageTier[]> {
  const { data } = await api.get<ListResponse<PackageTier>>("/packages");
  return data.data.packages;
}

/** GET /packages/mine — the user's subscriptions (history). */
export async function fetchMyPackages(): Promise<UserPackageRow[]> {
  const { data } = await api.get<ListResponse<UserPackageRow>>("/packages/mine");
  return data.data.packages;
}

/** POST /packages/activate — initiate a package activation (pending). */
export async function activatePackageRequest(packageId: string): Promise<UserPackageRow> {
  const { data } = await api.post<OneResponse>("/packages/activate", { packageId });
  return data.data.package;
}