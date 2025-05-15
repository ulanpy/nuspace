import { RecentCard } from "@/components/molecules/cards/recent-card";
import { StatCard } from "@/components/molecules/cards/stat-card";
import { products, users } from "@/data/temporary";
import { Package, Users, Image } from "lucide-react";

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
        <RecentCard
          title="Recent Products"
          items={products}
          typeContent="product"
        />
        <RecentCard
          title="Recent User Activity"
          items={users}
          typeContent="user"
        />
      </div>
    </div>
  );
};

export default AdminPage;