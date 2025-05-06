import { FeatureCard } from "@/components/molecules/cards/feature-card";
import { MdSell, MdEvent, MdRestaurantMenu } from "react-icons/md";
import { Link } from "react-router-dom";
export const FeatureSection = () => {
  const features = [
    {
      title: "Kupi-Prodai",
      description:
        "Here students have the opportunity to sell, buy or exchange their belongings.",
      icon: MdSell,
      link: "/apps/kupi-prodai",
    },
    {
      title: "NU Events",
      description:
        "Information about holidays, meetings and events that take place on the territory of the University. Students will be able to find activities that are interesting to them.",
      icon: MdEvent,
      link: "/apps/nu-events",
    },
    {
      title: "Dorm Eats",
      description:
        "Daily menu in the university canteen. What dishes are available, what dishes are being prepared - all this students have the opportunity to find out in advance.",
      icon: MdRestaurantMenu,
      link: "/apps/dorm-eats",
    },
  ];
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
