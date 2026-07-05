import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

/**
 * Run-detail loading skeleton. Mirrors the page's card layout (header +
 * run-information card + pipeline-stages card) so the transition into the
 * real content is layout-stable, not a blank flash (PRODUCT.md #3: speed is
 * trust; skeletons over spinners).
 */
export default function RunDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Checking your document">
        <Skeleton className="h-6 w-20 rounded-full" />
      </PageHeader>
      <Skeleton className="-mt-3 h-4 w-40" />

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-[200px_1fr]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="contents">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
