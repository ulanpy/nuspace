import { useState } from "react";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table";
import { Badge } from "@/components/atoms/badge";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";

// Mock user data
const mockUsers = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@example.com",
    products: 12,
    status: "Active",
    lastActive: "2023-10-01",
    registeredOn: "2023-01-15",
  },
  {
    id: 2,
    name: "Emma Johnson",
    email: "emma.j@example.com",
    products: 5,
    status: "Active",
    lastActive: "2023-10-05",
    registeredOn: "2023-03-22",
  },
  {
    id: 3,
    name: "Michael Brown",
    email: "michael.b@example.com",
    products: 0,
    status: "Inactive",
    lastActive: "2023-08-17",
    registeredOn: "2023-05-10",
  },
  {
    id: 4,
    name: "Sophia Williams",
    email: "s.williams@example.com",
    products: 8,
    status: "Active",
    lastActive: "2023-10-02",
    registeredOn: "2023-02-28",
  },
  {
    id: 5,
    name: "Daniel Davis",
    email: "daniel.d@example.com",
    products: 3,
    status: "Suspended",
    lastActive: "2023-07-14",
    registeredOn: "2023-04-05",
  },
];

const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter users based on search term
  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage marketplace users and their products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div>{user.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell>{user.products}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.status === "Active"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : user.status === "Suspended"
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        }
                        variant="outline"
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.registeredOn}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`${ROUTES.ADMIN.USER}/${user.id}`}>View Products</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;