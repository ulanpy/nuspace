
import { FeatureCard } from "@/components/molecules/cards";
import { features } from "@/data/features";
import { Link } from "react-router-dom";
export const FeatureSection = () => {
  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold mb-8 text-center">Main sections</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <Link to={feature.link} key={index}>
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};
