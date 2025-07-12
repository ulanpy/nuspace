import { QueryClient } from "@tanstack/react-query";

interface PollOptions<T> {
  checkFn: () => Promise<T | null>;
  onSuccess?: (data: T) => void;
  maxAttempts?: number;
  initialDelay?: number;
  backoffRate?: number;
  onError?: (error: any) => void;
}

export const pollWithExponentialBackoff = async <T>({
  checkFn,
  onSuccess,
  maxAttempts = 5,
  initialDelay = 1000,
  backoffRate = 1.5,
  onError,
}: PollOptions<T>): Promise<T | null> => {
  let attempts = 0;
  let delay = initialDelay;

  const poll = async (): Promise<T | null> => {
    if (attempts >= maxAttempts) return null;

    attempts++;

    try {
      const result = await checkFn();
      if (result) {
        onSuccess?.(result);
        return result;
      }
      delay = Math.min(delay * backoffRate, 10000); // Макс. 10 секунд
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(poll());
        }, delay);
      });
    } catch (error) {
      onError?.(error);
      return null;
    }
  };

  return poll();
};

export const pollForProductImages = (
  productId: number,
  queryClient: QueryClient,
  apiBaseKey: string,
  getProductById: (id: number) => Promise<any>,
) => {
  return pollWithExponentialBackoff({
    checkFn: async () => {
      const product = await getProductById(productId);
      if (product?.media?.length > 0) {
        return product;
      }
      return null;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({
        queryKey: [apiBaseKey],
      });

      console.log("Product images loaded successfully:", product.id);
    },
    onError: (error) => {
      console.error("Error checking product images:", error);
    },
  });
};
