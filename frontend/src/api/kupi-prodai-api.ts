import { queryOptions } from "@tanstack/react-query";
import { apiCall } from "./api";

// Types for the API
export const defaultSize = 15;
export const defaultPage = 1;

export interface ProductMedia {
  id: number;
  url: string;
}

export interface PaginatedResponse<T> {
  products: T[];
  num_of_pages: number;
}

// Updated enums to match backend
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
export type ProductStatus = "inactive" | "active" | "sold";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition: "new" | "like_new" | "used";
  status: "inactive" | "active";
  media: ProductMedia[];
  user_name?: string;
  user_surname?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NewProductRequest {
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  status: "active";
}

export interface UpdateProductRequest {
  product_id: number;
  name?: string;
  description?: string;
  price?: number;
  category?: ProductCategory;
  condition?: "new" | "like_new" | "used";
  status?: "inactive" | "active";
}

export interface SignedUrl {
  filename: string;
  upload_url: string;
}

export interface SignedUrlResponse {
  signed_urls: SignedUrl[];
}

// API base URL

type QueryParams = {
  page: number;
  size: number;
  category?: string;
  condition?: string;
};
// API functions
export const kupiProdaiApi = {
  // Get a paginated list of products
  baseKey: "products",
  getProductsQueryOptions: ({
    page = defaultPage,
    size = defaultSize,
    category,
    condition,
  }: QueryParams) => {
    return queryOptions({
      queryKey: [
        kupiProdaiApi.baseKey,
        "list",
        { page, size, category, condition },
      ],
      queryFn: ({ queryKey }) => {
        const [, , params] = queryKey as [string, string, QueryParams];
        let endpoint = `/products/list?size=${params.size}&page=${params.page}`;
        if (params.category) endpoint += `&category=${params.category}`;
        if (params.condition) endpoint += `&condition=${params.condition}`;

        return apiCall<PaginatedResponse<Product>>(endpoint);
      },
    });
  },

  getProduct: async (product_id: number): Promise<Product> => {
    return apiCall<Product>(`/products/${product_id}`, {
      method: "GET"
    });
  },

  // Get all products of the current user
  getUserProductsQueryOptions: () => {
    return queryOptions({
      queryKey: [kupiProdaiApi.baseKey, "userProducts"],
      queryFn: () => {
        return apiCall<Product[]>("/products/user");
      },
    });
  },

  // Create a new product
  createProduct: async (product: NewProductRequest): Promise<Product> => {
    return apiCall<Product>("/products/new", {
      method: "POST",
      json: product
    });
  },

  // Update a product - Fixed to use the correct endpoint and method
  updateProduct: async (product: UpdateProductRequest): Promise<any> => {
    return apiCall<any>("/products/", {
      method: "PATCH",
      json: product
    });
  },

  // Delete a product
  deleteProduct: async (productId: number): Promise<string> => {
    return apiCall<string>(`/products/${productId}`, {
      method: "DELETE"
    });
  },

  // Search for products
  getSearchProductQueryOptions: (keyword: string) => {
    return queryOptions({
      queryKey: ["search-products", keyword],
      queryFn: ({signal}) => {
        return apiCall<Product[]>(`/products/search/?keyword=${keyword}`, {signal});
      },
    });
  },

  // Get signed URLs for uploading images
  getSignedUrls: async (fileCount: number): Promise<SignedUrlResponse> => {
    return apiCall<SignedUrlResponse>(
      `/bucket/upload-url?file_count=${fileCount}`
    );
  },

  // Upload an image to the bucket
  uploadImage: async (
    file: File,
    filename: string,
    entityId: number,
    mediaOrder: number
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", filename);
    formData.append("mime_type", file.type);
    formData.append("section", "kp"); // kp for Kupi&Prodai
    formData.append("entity_id", entityId.toString());
    formData.append("media_purpose", "banner");
    formData.append("media_order", mediaOrder.toString());

    const response = await apiCall(`/bucket/upload-image/`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    console.log('response', response)

    return response as string
  },

  // Check Telegram binding status
  checkTelegramStatus: async (): Promise<{ tg_linked: boolean }> => {
    return apiCall<{ tg_linked: boolean }>("/me/tg-status");
  },
};
