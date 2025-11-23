// import { useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { Button } from "@/components/atoms/button";

// import { Input } from "@/components/atoms/input";
// import { ArrowLeft, Search } from "lucide-react";
// import { ProductsTable } from "@/features/marketplace/components/tables/products-table";
// import { mockUser, mockUserProducts } from "@/data/temporary";
// import { UserCard } from "@/components/organisms/admin/user-card";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/atoms/card";
// import { ROUTES } from "@/data/routes";
// import { useUser } from "@/hooks/use-user";

// const UserPage = () => {
//   const { userId } = useParams();
//   const [searchTerm, setSearchTerm] = useState("");

//   // Filter products based on search term
//   const filteredProducts = mockUserProducts.filter((product) =>
//     product.name.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center gap-4">
//         <Button variant="outline" size="icon" asChild>
//           <Link to={ROUTES.ADMIN.USERS.path}>
//             <ArrowLeft className="h-4 w-4" />
//           </Link>
//         </Button>
//         <h1 className="text-2xl font-bold tracking-tight">
//           {mockUser.name}'s Products
//         </h1>
//       </div>

//       <UserCard mockUser={mockUser} />

//       <Card>
//         <CardHeader>
//           <CardTitle>User Products</CardTitle>
//           <CardDescription>
//             Manage all products created by this user.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="flex flex-col sm:flex-row gap-4 mb-6">
//             <div className="relative flex-1">
//               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Search products..."
//                 className="pl-9"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//           </div>

//           <div className="border rounded-md">
//             <ProductsTable
//               filteredProducts={filteredProducts}
//               hasSeller={false}
//             />
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default UserPage;
