// import React, { useState } from "react";
// import { Link, Outlet } from "react-router-dom";
// import { cn } from "@/utils/utils";
// import {
//   LayoutDashboard,
//   Package,
//   Users,
//   ChevronLeft,
//   ChevronRight,
//   Search,
// } from "lucide-react";
// import { Button } from "@/components/atoms/button";
// import { Input } from "@/components/atoms/input";
// import { ROUTES } from "@/data/routes";

// const AdminLayout: React.FC = () => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
//   const navItems = [ROUTES.ADMIN.DASHBOARD, ROUTES.ADMIN.PRODUCTS, ROUTES.ADMIN.USERS];
//   const toggleSidebar = () => {
//     setSidebarCollapsed(!sidebarCollapsed);
//   };

//   return (
//     <div className="min-h-screen flex bg-gray-50">
//       {/* Sidebar */}
//       <aside
//         className={cn(
//           "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
//           sidebarCollapsed ? "w-16" : "w-64",
//         )}
//       >
//         {/* Logo area */}
//         <div className="p-4 border-b border-gray-200 flex items-center justify-between">
//           {!sidebarCollapsed && (
//             <Link
//               className="font-bold text-lg text-blue-600"
//             >
//               Marketplace
//             </Link>
//           )}
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={toggleSidebar}
//             className="ml-auto"
//           >
//             {sidebarCollapsed ? (
//               <ChevronRight size={20} />
//             ) : (
//               <ChevronLeft size={20} />
//             )}
//           </Button>
//         </div>

//         {/* Navigation Links */}
//         <nav className="flex-1 py-4">
//           <ul className="space-y-1 px-2">
//             {navItems.map((item) => (
//               <NavItem
//                 key={item.path}
//                 to={item.path}
//                 icon={item.icon}
//                 label={item.label}
//                 collapsed={sidebarCollapsed}
//               />
//             ))}
//           </ul>
//         </nav>

//         {/* User Profile */}
//         <div className="border-t border-gray-200 p-4">
//           <div className="flex items-center">
//             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
//               A
//             </div>
//             {!sidebarCollapsed && (
//               <div className="ml-3">
//                 <p className="text-sm font-medium">Admin User</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </aside>

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         {/* Top bar */}
//         <header className="bg-white border-b border-gray-200 p-4 flex items-center">
//           <div className="flex-1 flex">
//             <div className="max-w-md w-full lg:max-w-xs relative">
//               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                 <Search className="h-4 w-4 text-gray-400" />
//               </div>
//               <Input
//                 type="search"
//                 placeholder="Search..."
//                 className="pl-10 py-2"
//               />
//             </div>
//           </div>
//         </header>

//         {/* Page Content */}
//         <main className="flex-1 overflow-auto p-6">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// };

// interface NavItemProps {
//   to: string;
//   icon: React.ReactNode;
//   label: string;
//   collapsed: boolean;
// }

// const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed }) => {
//   return (
//     <li>
//       <Link
//         to={to}
//         className="flex items-center text-gray-700 hover:bg-gray-100 rounded-md p-2 transition-all duration-150 group"
//       >
//         <span className="text-gray-500 group-hover:text-blue-600">{icon}</span>
//         {!collapsed && (
//           <span className="ml-3 text-sm font-medium group-hover:text-blue-600">
//             {label}
//           </span>
//         )}
//       </Link>
//     </li>
//   );
// };

// export default AdminLayout;
