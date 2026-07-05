import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading shell for the reports list. Mirrors reports/page.tsx: PageHeader + a
 *  5-column table. Skeletons over spinners (PRODUCT.md design principle #3). */
export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Coverage
              </TableHead>
              <TableHead className="text-right">Citations</TableHead>
              <TableHead className="hidden sm:table-cell">Generated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <Skeleton className="ml-auto h-4 w-12" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-10" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
