import { Button } from "@/components/atoms/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table";
import { ROUTES } from "@/data/routes";
import { Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
interface filteredProducts {
  id: number;
  name: string;
  price: number;
  category: string;
  seller?: string;
  status: string;
  images: number;
  createdAt: string;
}
interface ProductsTableProps {
  filteredProducts: filteredProducts[];
  hasSeller?: boolean;
}
export const ProductsTable = ({
  filteredProducts,
  hasSeller = true,
}: ProductsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">ID</TableHead>
          <TableHead>Product Name</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="hidden md:table-cell">Category</TableHead>
          {hasSeller && (
            <TableHead className="hidden md:table-cell">Seller</TableHead>
          )}
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
            <TableCell className="hidden md:table-cell">
              {product.category}
            </TableCell>
            {hasSeller && (
              <TableCell className="hidden md:table-cell">
                {product.seller}
              </TableCell>
            )}

            <TableCell className="hidden md:table-cell">
              <div className="flex -space-x-2">
                {Array(Math.min(3, product.images))
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={`${product.id}-image=${i}`}
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
                  <Link to={`${ROUTES.ADMIN.PRODUCTS.child}/${product.id}`}>
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
            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
              No products found matching your criteria
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
