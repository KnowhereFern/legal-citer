import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the public verification page. `/v/[id]` is
 * `force-dynamic` with three sequential Prisma calls, so this mirrors the
 * card shape (header, the dl, the 6-up count grid) to hold layout while the
 * server resolves. Per DESIGN.md: skeletons over spinners — never leave the
 * user wondering if the app froze.
 */
export default function VerifyRecordLoading() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />

      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2.5 focus-ring rounded-lg"
        aria-hidden
        tabIndex={-1}
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {BRAND.company}
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* dl — label + value rows */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[170px_1fr]">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="contents">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full max-w-[16rem]" />
                </div>
              ))}
            </div>

            <Separator />

            {/* 6-up count grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-center gap-2">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-3 w-40" />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Skeleton className="h-3 w-80" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </div>
  );
}
