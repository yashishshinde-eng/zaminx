import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton layout matching the Trade page while market data loads. */
export function TradeLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full max-w-md rounded-full" />
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <Skeleton className="h-72 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <Skeleton className="h-[440px] rounded-2xl" />
        </div>
        <Skeleton className="h-[440px] rounded-2xl" />
      </div>
    </div>
  );
}