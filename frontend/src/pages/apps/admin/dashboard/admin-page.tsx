import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Package, Users, Image, ArrowUp } from "lucide-react";

const AdminPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Products"
          value="1,234"
          icon={<Package className="h-8 w-8 text-blue-600" />}
          change="+12%"
          trend="up"
        />
        <StatCard
          title="Total Users"
          value="567"
          icon={<Users className="h-8 w-8 text-indigo-600" />}
          change="+7%"
          trend="up"
        />
        <StatCard
          title="Media Files"
          value="3,129"
          icon={<Image className="h-8 w-8 text-purple-600" />}
          change="+24%"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex items-center p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded bg-gray-200 flex-shrink-0"></div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium">Product {item}</p>
                    <p className="text-sm text-gray-500">Added 2 days ago</p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">$199.99</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex items-center p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="ml-4">
                    <p className="font-medium">User {item}</p>
                    <p className="text-sm text-gray-500">Added a new product</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
  trend: "up" | "down";
}

const StatCard = ({ title, value, icon, change, trend }: StatCardProps) => {
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

export default AdminPage;