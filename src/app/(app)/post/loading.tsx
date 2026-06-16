import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-8 w-44" />
      <Card className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-28" />
        </div>
      </Card>
    </main>
  );
}
