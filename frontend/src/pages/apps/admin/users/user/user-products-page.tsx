import { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import { ArrowLeft, Search, Edit, Eye, Trash2 } from "lucide-react";
import { ROUTES } from "@/data/routes";

// Mock user data
const mockUser = {
  id: 1,
  name: "John Smith",
  email: "john.smith@example.com",
  products: 12,
  status: "Active",
  lastActive: "2023-10-01",
  registeredOn: "2023-01-15",
};

// Mock products data
const mockUserProducts = [
  {
    id: 101,
    name: "Professional DSLR Camera",
    price: 1299.99,
    category: "Electronics",
    status: "Active",
    images: 6,
    createdAt: "2023-09-12",
  },
  {
    id: 102,
    name: "Camera Tripod",
    price: 89.99,
    category: "Electronics",
    status: "Active",
    images: 3,
    createdAt: "2023-09-15",
  },
  {
    id: 103,
    name: "Camera Lens 50mm",
    price: 349.99,
    category: "Electronics",
    status: "Active",
    images: 4,
    createdAt: "2023-09-18",
  },
  {
    id: 104,
    name: "Camera Bag",
    price: 79.99,
    category: "Accessories",
    status: "Active",
    images: 2,
    createdAt: "2023-09-20",
  },
];

const UserProductsPage = () => {
  const { userId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter products based on search term
  const filteredProducts = mockUserProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{mockUser.name}'s Products</h1>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>User Products</CardTitle>
          <CardDescription>
            Manage all products created by this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
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
                  <TableHead>Product Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Images</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gray-100"></div>
                        <div>{product.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex -space-x-2">
                        {Array(Math.min(3, product.images)).fill(0).map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-white bg-gray-200"
                          ></div>
                        ))}
                        {product.images > 3 && (
                          <div className="w-6 h-6 rounded-full border border-white bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                            +{product.images - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {product.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <Link to={`/admin/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <Link to={`${ROUTES.ADMIN.PRODUCT}/${product.id}`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No products found matching your criteria
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

export default UserProductsPage;