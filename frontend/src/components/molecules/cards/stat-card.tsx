import { Card, CardContent } from "@/components/atoms/card";
import { ArrowUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
  trend: "up" | "down";
}

export const StatCard = ({
  title,
  value,
  icon,
  change,
  trend,
}: StatCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div>{icon}</div>
        </div>
        <div className="mt-4 flex items-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
              trend === "up"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {trend === "up" ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : (
              <ArrowUp className="h-3 w-3 mr-1 transform rotate-180" />
            )}
            {change}
          </span>
          <span className="text-xs text-gray-500 ml-2">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
};
