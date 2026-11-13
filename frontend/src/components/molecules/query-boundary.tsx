import type { ReactNode } from "react";

export type QueryBoundaryProps<TData> = {
  data: TData | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  children: (data: TData) => ReactNode;
};

export function QueryBoundary<TData>({
  data,
  isLoading = false,
  isError = false,
  loadingFallback = null,
  errorFallback = null,
  children,
}: QueryBoundaryProps<TData>) {
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (isError || data == null) {
    return <>{errorFallback}</>;
  }

  return <>{children(data)}</>;
}


