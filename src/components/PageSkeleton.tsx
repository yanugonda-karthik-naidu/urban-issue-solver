import { Skeleton } from "@/components/ui/skeleton";

export const PageSkeleton = () => (
  <div className="min-h-screen bg-background animate-fade-in">
    {/* Header skeleton */}
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
    
    {/* Content skeleton */}
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </div>
);

export const AdminPageSkeleton = () => (
  <div className="min-h-screen bg-background flex animate-fade-in">
    {/* Sidebar skeleton */}
    <div className="w-64 border-r bg-card/50 p-4 hidden md:block">
      <Skeleton className="h-8 w-32 mb-8" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
    
    {/* Main content skeleton */}
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      
      {/* Table skeleton */}
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  </div>
);

export const MapPageSkeleton = () => (
  <div className="min-h-screen bg-background flex animate-fade-in">
    {/* Sidebar skeleton */}
    <div className="w-64 border-r bg-card/50 p-4 hidden md:block">
      <Skeleton className="h-8 w-32 mb-8" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
    
    {/* Main content with map skeleton */}
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Map placeholder */}
      <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-lg" />
    </div>
  </div>
);
