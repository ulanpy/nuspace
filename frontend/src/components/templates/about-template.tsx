import { AboutHeader } from "@/components/organisms/about/about-header";
import { MessionSection } from "@/components/organisms/about/mission-section";
import { AboutUsSection } from "@/components/organisms/about/about-us-section";
import { PageContainer } from "@/components/atoms/page-container";
import { Section } from "@/components/atoms/section";

export function AboutTemplate() {
  return (
    <div className="min-h-screen">
      <PageContainer maxWidth="prose" as="main">
        <Section>
          <AboutHeader />
        </Section>
        <Section>
          <MessionSection />
        </Section>
        <Section>
          <AboutUsSection />
        </Section>
      </PageContainer>
    </div>
  );
}
