import { Card, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-8 w-40" />
      {[0, 1].map((i) => (
        <Card key={i} className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-3/5" />
        </Card>
      ))}
    </main>
  );
}
