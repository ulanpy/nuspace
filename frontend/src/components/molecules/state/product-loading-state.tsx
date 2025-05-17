import { Card, CardContent } from "@/components/atoms/card";
import { Skeleton } from "@/components/atoms/skeleton";

export function ProductLoadingState({count = 8}: {count?: number}) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: count }).map((_, index) => (
          <Card className="overflow-hidden h-full" key={index}>
            <Skeleton className="aspect-square w-full" />
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
