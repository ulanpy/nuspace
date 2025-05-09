import { IconType } from "react-icons/lib";
import { Card } from "@/components/atoms/card";
import { useTheme } from "@/context/theme-provider";
interface FeatureCardProps {
  title: string;
  description: string;
  icon: IconType;
  iconSize?: number;
  iconColor?: string;
}

export const FeatureCard = ({
  title,
  description,
  icon: Icon,
  iconSize = 36,
  iconColor = "text-indigo-500",
}: FeatureCardProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Card
      className={`p-6 rounded-lg hover:scale-105 transition-all h-full ${
        isDark ? "bg-gray-800 hover:bg-slate-800" : "bg-white"
      } shadow-md`}
    >
      <div className="flex justify-center mb-4">
        <Icon size={iconSize} className={iconColor} />
      </div>
      <h3 className="text-xl font-semibold mb-3 text-center">{title}</h3>
      <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
        {description}
      </p>
    </Card>
  );
};
