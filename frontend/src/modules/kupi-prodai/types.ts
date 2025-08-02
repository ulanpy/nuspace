

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
    condition: "new" | "like_new" | "used";
    status: Status;
    media: ProductMedia[];
    created_at?: string;
    updated_at?: string;
    seller: Seller;
    user_telegram_id: 0;
    permissions: Permission;
}

export type NewProductRequest = {
    name: string;
    description: string;
    price: number;
    category: ProductCategory;
    condition: ProductCondition;
    status: string;
};

export interface ProductMedia {
    id: number;
    url: string;
    order: number;
}

export type ActiveTab = "buy" | "sell" | "my-listings";

// SearchInput
export interface PreSearchedProduct {
    id: number;
    name: string;
    condition: ProductCondition;
    category: ProductCategory;
    }

export type SearchInputProps = {
    inputValue: string;
    setInputValue: (value: string) => void;
    preSearchedProducts: PreSearchedProduct[] | null;
    handleSearch: (inputValue: string) => void;
    setKeyword: (keyword: string) => void;
    setSelectedCondition?: (condition: string) => void;
    };