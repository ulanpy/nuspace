import { motion } from "framer-motion";
import { Pagination } from "../../molecules/pagination";
import { useNavigate } from "react-router-dom";
import { useListingState } from "@/context/listing-context";
import { MessageButton } from "@/components/molecules/buttons/message-button";
import { ProductCard } from "@/components/molecules/cards/product-card";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

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
};
export function ProductGrid({
  products,
  className,
}: {
  products: Types.PaginatedResponse<Types.Product> | null;
  className?: string;
}) {
  const navigate = useNavigate();
  const { currentPage, setCurrentPage } = useListingState();
  return (
    <>
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {products?.products.map((product) => (
          <motion.div key={product.id} variants={itemVariants}>
            <ProductCard
              product={product}
              onClick={() =>
                navigate(`/apps/kupi-prodai/product/${product.id}`)
              }
            >
              <MessageButton/>
            </ProductCard>
          </motion.div>
        ))}
      </motion.div>
      <Pagination
        length={products?.num_of_pages ?? 0}
        currentPage={currentPage}
        onChange={(page) => setCurrentPage(page)}
      />
    </>
  );
}
