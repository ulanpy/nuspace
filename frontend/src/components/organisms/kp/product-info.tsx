"use client";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import {
  formatDateWithContext,
  formatRelativeTime,
} from "@/utils/date-formatter";
import { useUser } from "@/hooks/use-user";

interface ProductInfoProps {
  product: any;
}

export const ProductInfo = ({ product }: ProductInfoProps) => {
  const { user } = useUser();

  const getConditionDisplay = (condition: string) => {
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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-500";
      case "like_new":
        return "bg-blue-500";
      case "used":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryDisplay = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formattedCreatedAt = product.created_at
    ? formatDateWithContext(product.created_at)
    : "Unknown date";
  const wasUpdated =
    product.updated_at &&
    product.created_at &&
    new Date(product.updated_at).getTime() >
      new Date(product.created_at).getTime();
  const formattedUpdatedAt =
    wasUpdated && product.updated_at
      ? `Updated ${formatRelativeTime(product.updated_at)}`
      : null;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
      <div className="flex items-center mb-4">
        <Badge className={`${getConditionColor(product.condition)} mr-2`}>
          {getConditionDisplay(product.condition)}
        </Badge>
        <Badge variant="secondary">
          {getCategoryDisplay(product.category)}
        </Badge>
      </div>
      <p className="text-gray-600 mb-4">{product.description}</p>
      <div className="flex items-center justify-between mb-4">
        <p className="text-2xl font-bold">
          {product.price.toLocaleString()} KZT
        </p>
        {user && user.id !== product.user_id && (
          <Button>Contact Seller</Button>
        )}
      </div>
      <div className="text-sm text-gray-500">
        <p>Posted: {formattedCreatedAt}</p>
        {formattedUpdatedAt && <p>{formattedUpdatedAt}</p>}
      </div>
    </div>
  );
}; 