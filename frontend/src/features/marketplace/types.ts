import { Media } from "../media/types/types";

export type ProductCondition = "new" | "like_new" | "used";

export type ProductCategory =
    | "books"
    | "electronics"
    | "clothing"
    | "furniture"
    | "appliances"
    | "sports"
    | "stationery"
    | "art_supplies"
    | "beauty"
    | "services"
    | "food"
    | "tickets"
    | "transport"
    | "others";
    
export type Status = "inactive" | "active";


export interface Seller {
    sub: string;
    name: string;
    surname: string;
    picture: string;
}
export interface Permission {
    can_edit: boolean;
    can_delete: boolean;
    editable_fields: string[];
}
export interface Product {
    id: number;
    name: string;
    description: string;
    user_sub: string;
    price: number;
    category: ProductCategory;
    condition: ProductCondition;
    status: Status;
    media: Media[];
    created_at?: string;
    updated_at?: string;
    seller: Seller;
    user_telegram_id?: number;
    permissions: Permission;
}


export type ActiveTab = "buy" | "sell" | "my-listings";

// SearchInput
export interface PreSearchedProduct {
    id: number;
    name: string;
    condition: ProductCondition;
    category: ProductCategory;
}


export type NewProductRequest = {
    name: string;
    description: string;
    price: number;
    user_sub: string;
    category: ProductCategory;
    condition: ProductCondition;
    status: Status;
};

  export interface UpdateProductRequest {
    product_id: number;
    name?: string;
    description?: string;
    price?: number;
    category?: ProductCategory;
    condition?: ProductCondition;
    status?: "inactive" | "active";
  }
    
  export type QueryParams = {
    page: number;
    size: number;
    category?: string;
    condition?: string;
    keyword?: string;
  };