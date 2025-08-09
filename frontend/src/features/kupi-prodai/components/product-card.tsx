"use client";
import { Card, CardContent } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import {
  getCategoryDisplay,
  getConditionColor,
  getConditionDisplay,
  getPlaceholderImage,
} from "@/utils/products-utils";
import { Product } from "@/features/kupi-prodai/types";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  actions?: React.ReactNode;
}

export function ProductCard({ product, onClick, actions }: ProductCardProps) {
  return (
    <Card
      className="overflow-hidden h-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-square relative">
        <img
          src={getPlaceholderImage(product)}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        <Badge
          className={`absolute top-2 right-2 ${getConditionColor(
            product.condition,
          )} text-white text-xs`}
        >
          {getConditionDisplay(product.condition)}
        </Badge>
      </div>
      <CardContent className="p-2 sm:p-3">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="font-medium text-xs sm:text-sm line-clamp-2 break-all break-words hyphens-auto">
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
        <div className="flex justify-between">{actions}</div>
      </CardContent>
    </Card>
  );
}
