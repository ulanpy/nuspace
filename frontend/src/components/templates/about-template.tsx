import { useTheme } from "@/context/theme-provider";
import { AboutHeader } from "../organisms/about/about-header";
import { MessionSection } from "../organisms/about/mession-section";
import { FeatureSection } from "../organisms/about/feature-section";
import { AboutUsSection } from "../organisms/about/about-us-section";

export function AboutTemplate() {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <div
      className={`min-h-screen ${
        isDarkTheme ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <AboutHeader />
        <MessionSection />
        <FeatureSection />
        <AboutUsSection />
      </div>
    </div>
  );
}
