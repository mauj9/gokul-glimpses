import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-full" />
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex items-center gap-3 !p-4">
          <Skeleton className="h-8 w-8 !rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </Card>
      ))}
    </main>
  );
}
