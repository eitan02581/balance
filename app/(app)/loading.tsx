import { Skeleton } from "@/components/ui/skeleton"

/** Route-level skeleton: shown instantly while the next page's data loads. */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-200">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr_0.9fr]">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
      </div>
      <Skeleton className="mt-8 mb-3 h-6 w-40 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Skeleton className="h-[420px] rounded-3xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}
