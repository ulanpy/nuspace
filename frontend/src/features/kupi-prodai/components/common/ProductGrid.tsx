import { motion } from "framer-motion";
import { Pagination } from "../../../../components/molecules/pagination";
import { useNavigate } from "react-router-dom";
import { MessageButton } from "@/components/molecules/buttons/message-button";
import { ProductCard } from "@/features/kupi-prodai/components/product-card";
import { ROUTES } from "@/data/routes";
import { Product } from "@/features/kupi-prodai/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
} as const;
export function ProductGrid({
  products,
  page,
  setPage,
  className,
}: {
  products: Types.PaginatedResponse<Product, "products"> | null;
  page: number;
  setPage: (page: number) => void;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <>
      <motion.div
        className={
          className
            ? className
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3"
        }
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {products?.products.map((product: Product) => (
          <motion.div key={product.id} variants={itemVariants}>
            <ProductCard
              product={product}
              onClick={() =>
                navigate(
                  ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL_FN(product.id.toString()),
                )
              }
              actions={<MessageButton />}
            />
          </motion.div>
        ))}
      </motion.div>
      <Pagination
        length={products?.total_pages ?? 0}
        currentPage={page}
        onChange={(page) => setPage(page)}
      />
    </>
  );
}
