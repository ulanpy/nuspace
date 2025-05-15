import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/atoms/table";
import { ROUTES } from "@/data/routes";
import { Link } from "react-router-dom";
interface FilteredUser {
    id: number;
    name: string;
    email: string;
    products: number;
    status: string;
    lastActive: string;
    registeredOn: string;
}
interface UsersTableProps {
  filteredUsers: FilteredUser[]
}
export const UsersTable = ({filteredUsers}: UsersTableProps) => {
  return (
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
            <TableCell className="hidden md:table-cell">
              {user.registeredOn}
            </TableCell>
            <TableCell>
              <Button variant="outline" size="sm" asChild>
                <Link to={`${ROUTES.ADMIN.USER}/${user.id}`}>
                  View Products
                </Link>
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
  );
};
