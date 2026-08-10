import { api } from "./axios";
import type { ActivatePackageResponse, PackageTargetLookup, PackageTier, UserPackageRow } from "@zeminex/shared";

interface ListResponse<T> {
  data: { packages: T[] };
}
interface ActivateResponse {
  data: ActivatePackageResponse;
}
interface LookupResponse {
  data: PackageTargetLookup;
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

/** POST /packages/activate-for — an active user pays from their own Main wallet
 *  to activate a package for another inactive user (the beneficiary). */
export async function activatePackageForRequest(
  packageId: string,
  targetUserId: string,
): Promise<ActivatePackageResponse> {
  const { data } = await api.post<ActivateResponse>("/packages/activate-for", { packageId, targetUserId });
  return data.data;
}

/** GET /packages/lookup-target — resolve a referral code to a user so the actor
 *  can confirm the beneficiary before activating a package for them. */
export async function lookupPackageTarget(code: string): Promise<PackageTargetLookup> {
  const { data } = await api.get<LookupResponse>("/packages/lookup-target", { params: { code } });
  return data.data;
}