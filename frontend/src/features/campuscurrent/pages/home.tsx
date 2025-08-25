"use client";

import MotionWrapper from "@/components/atoms/motion-wrapper";

// Main component
export default function NUEventsPage() {
  return (
    <MotionWrapper>
      <div className="w-full overflow-x-hidden">
        <section className="py-10">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6">
            <h2 className="text-xl font-semibold">Campus Current</h2>
            <p className="text-muted-foreground mt-2">
              Explore Events and Communities using the tabs above.
            </p>
          </div>
        </section>
      </div>
    </MotionWrapper>
  );
}
