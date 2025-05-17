"use client";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "../../atoms/card";
import { Badge } from "../../atoms/badge";
import { Button } from "../../atoms/button";

interface ProductCardProps {
  product: Types.Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const getConditionColor = (condition: Types.Product["condition"]) => {
    switch (condition) {
      case "new":
        return "bg-green-500";
      case "used":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };
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
  const getPlaceholderImage = () => {
    return (
      product.media[0]?.url || "https://placehold.co/200x200?text=No+Image"
    );
  };
  const getCategoryDisplay = (category: string) => {
    return (
      category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
    );
  };

  return (
    <Card
      className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-square relative">
        <img
          src={getPlaceholderImage()}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        <Badge
          className={`absolute top-2 right-2 ${getConditionColor(
            product.condition
          )} text-white text-xs`}
        >
          {getConditionDisplay(product.condition)}
        </Badge>
      </div>
      <CardContent className="p-2 sm:p-3">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="font-medium text-xs sm:text-sm line-clamp-1">
              {product.name}
            </h3>
            <p className="text-sm sm:text-base font-bold">{product.price} ₸</p>
          </div>
        </div>
        <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground mb-1">
          <div className="flex items-center">
            <span>
              {product.category && getCategoryDisplay(product.category)}
            </span>
          </div>
        </div>
        <div className="flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="flex gap-1 text-muted-foreground hover:text-primary"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Message</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
