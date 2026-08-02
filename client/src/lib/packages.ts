import { api } from "./axios";
import type { ActivatePackageResponse, PackageTier, UserPackageRow } from "@zaminex/shared";

interface ListResponse<T> {
  data: { packages: T[] };
}
interface ActivateResponse {
  data: ActivatePackageResponse;
}

/** GET /packages — active catalog. */
export async function fetchPackageCatalog(): Promise<PackageTier[]> {
  const { data } = await api.get<ListResponse<PackageTier>>("/packages");
  return data.data.packages;
}

/** GET /packages/mine — the user's subscriptions (history + joined payment). */
export async function fetchMyPackages(): Promise<UserPackageRow[]> {
  const { data } = await api.get<ListResponse<UserPackageRow>>("/packages/mine");
  return data.data.packages;
}

/** POST /packages/activate — initiate a package activation (pending + invoice). */
export async function activatePackageRequest(packageId: string): Promise<ActivatePackageResponse> {
  const { data } = await api.post<ActivateResponse>("/packages/activate", { packageId });
  return data.data;
}