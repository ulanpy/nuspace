import { Badge } from "@/components/atoms/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
interface MockUser {
  id: number;
  name: string;
  email: string;
  products: number;
  status: string;
  lastActive: string;
  registeredOn: string;
}
interface UserCardProps {
  mockUser: MockUser;
}
export const UserCard = ({ mockUser }: UserCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Basic information about this user.
            </CardDescription>
          </div>
          <Badge
            className={
              mockUser.status === "Active"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }
            variant="outline"
          >
            {mockUser.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p>{mockUser.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Products</p>
            <p>{mockUser.products}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Last Active</p>
            <p>{mockUser.lastActive}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Registered On</p>
            <p>{mockUser.registeredOn}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
