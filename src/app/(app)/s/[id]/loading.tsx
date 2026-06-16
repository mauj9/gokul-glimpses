import { Card, Skeleton } from "@/components/ui";

function PostSkeleton() {
  return (
    <Card className="space-y-3 !p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 !rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </main>
  );
}
