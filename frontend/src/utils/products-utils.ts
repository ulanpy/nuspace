import { Product } from "@/features/marketplace/types";

export const getConditionColor = (condition: Product["condition"]) => {
  switch (condition) {
    case "new":
      return "bg-green-500";
    case "used":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
};
export const getConditionDisplay = (condition: string) => {
  switch (condition) {
    case "new":
      return "New";
    case "like_new":
      return "Like New";
    case "used":
      return "Used";
    default:
      return condition;
  }
};
export const getPlaceholderImage = (product: Product) => {
  return product.media[0]?.url || "https://placehold.co/200x200?text=No+Image";
};
export const getCategoryDisplay = (category: string) => {
  return (
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
};
