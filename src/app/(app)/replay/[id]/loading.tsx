import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-8 w-3/5" />
      <Card className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-12 w-40" />
      </Card>
    </main>
  );
}
