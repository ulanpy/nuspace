import { Button } from "@/components/atoms/button";


export function ProductErrorState({ error }: { error: string }) {
  return (
    <div className="text-center py-12 text-destructive">
      <p>{error}</p>
      <Button
        variant="outline"
        className="mt-4"
        // onClick={fetchProducts}
      >
        Try Again
      </Button>
    </div>
  );
}
