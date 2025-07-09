import { Spinner } from "@/components/atoms/spinner";
import { ComponentType, Suspense } from "react";

export const withSuspense =
  <P extends object>(Component: ComponentType<P>) =>
  (props: P) => {
    return (
      <Suspense fallback={<Spinner />}>
        <Component {...props} />
      </Suspense>
    );
  };
