import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="animate-in">
      <Skeleton className="h-9 w-64 mb-2" />
      <Skeleton className="h-5 w-96 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
