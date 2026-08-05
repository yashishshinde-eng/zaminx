import { useQuery } from "@tanstack/react-query";
import { fetchPage } from "@/lib/cms";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared";
import { Breadcrumb } from "@/components/shared";

interface CmsPageViewProps {
  slug: string;
  /** Hide the H1 PageHeader for pages whose first block is already a hero (e.g. home). */
  bare?: boolean;
}

/** Generic CMS-driven page: fetches by slug, renders blocks, sets SEO. */
export function CmsPageView({ slug, bare = false }: CmsPageViewProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cms", "page", slug],
    queryFn: () => fetchPage(slug),
    retry: 1,
  });

  useDocumentMeta({
    title: data?.seo?.title ?? data?.title,
    description: data?.seo?.description,
  });

  if (isLoading) {
    return (
      <div className="container py-16">
        {!bare && <Skeleton className="mb-6 h-10 w-64" />}
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container py-16">
        <ErrorState
          message="We couldn't load this page. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container py-16 sm:py-20">
      {!bare && (
        <div className="mb-10">
          <Breadcrumb
            items={[
              { label: "Home", to: "/" },
              { label: data.title },
            ]}
          />
          <PageHeader title={data.title} />
        </div>
      )}
      <BlockRenderer blocks={data.blocks} />
    </div>
  );
}