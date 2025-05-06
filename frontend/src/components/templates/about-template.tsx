import { useTheme } from "@/context/theme-provider";
import { Header } from "@/components/organisms/about/header";
import { MessionSection } from "@/components/organisms/about/mession-section";
import { FeatureSection } from "@/components/organisms/about/feature-section";
import { TeamSection } from "@/components/organisms/about/team-section";
import { ContactSection } from "@/components/organisms/about/contact-section";

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
        <Header />
        <MessionSection />
        <FeatureSection />
        <TeamSection />
        <ContactSection />
      </div>
    </div>
  );
}
