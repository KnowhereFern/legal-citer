import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";

/**
 * Report loading skeleton. Mirrors the full-view card stack (header → hero
 * summary → identification → summary of results) so the page doesn't jump
 * when the real content streams in (PRODUCT.md #3: speed is trust).
 */
export default function ReportLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Your citation report">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-28" />
      </PageHeader>
      <Skeleton className="-mt-3 h-4 w-40" />

      {/* Hero summary */}
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-7 w-full max-w-md" />
        </CardContent>
      </Card>

      <Skeleton className="h-9 w-full" />

      {/* Identification */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary of results */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
