import { AboutHeader } from "@/components/organisms/about/about-header";
import { MessionSection } from "@/components/organisms/about/mission-section";
import { AboutUsSection } from "@/components/organisms/about/about-us-section";

export function AboutTemplate() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <AboutHeader />
        <MessionSection />
        <AboutUsSection />
      </div>
    </div>
  );
}
