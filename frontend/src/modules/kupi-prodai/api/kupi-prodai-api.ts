import { queryOptions } from "@tanstack/react-query";
import { apiCall } from "../../../api/api";

// Types for the API
export const defaultSize = 5;
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
  user_sub: string;
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

export interface SignedUrlRequest {
  entity_type: string;
  entity_id: number;
  media_format: string;
  media_order: number;
  mime_type: string;
  content_type: string;
}

export interface SignedUrlResponse {
  filename: string;
  upload_url: string;
  entity_type: string;
  entity_id: number;
  media_format: string;
  media_order: number;
  mime_type: string;
}

// API base URL

type QueryParams = {
  page: number;
  size: number;
  category?: string;
  condition?: string;
  keyword?: string;
};
// API functions
export const kupiProdaiApi = {
  // Get a paginated list of products
  baseKey: "products",
  getUserQueryOptions: () => {
    return queryOptions({
      queryKey: ["user"],
      queryFn: () =>
        apiCall<Types.User>("/me", {
          method: "GET",
          credentials: "include",
        }),
    });
  },
  getProductsQueryOptions: ({
    page = defaultPage,
    size = defaultSize,
    category,
    condition,
    keyword,
  }: QueryParams) => {
    return queryOptions({
      queryKey: [
        kupiProdaiApi.baseKey,
        "list",
        { page, size, category, condition, keyword },
      ],
      queryFn: ({ queryKey }) => {
        const [, , params] = queryKey as [string, string, QueryParams];
        let endpoint = `/products?size=${params.size}&page=${params.page}&status=active`;
        if (params.category) endpoint += `&category=${params.category}`;
        if (params.condition) endpoint += `&condition=${params.condition}`;
        if (params.keyword) endpoint += `&keyword=${params.keyword}`;

        return apiCall<PaginatedResponse<Product>>(endpoint);
      },
    });
  },

  // Get all products of the current user
  getUserProductsQueryOptions: () => {
    return queryOptions({
      queryKey: [kupiProdaiApi.baseKey, "userProducts"],
      queryFn: () => {
        return apiCall<PaginatedResponse<Product>>(
          `/products?size=${defaultSize}&page=${defaultPage}&owner_sub=me`,
        );
      },
    });
  },

  getProductQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["product", id],
      queryFn: () => apiCall<Types.Product>(`/products/${id}`),
    });
  },

  getProduct: (id: number) => {
    return apiCall<Product>(`/products/${id}`);
  },

  // Create a new product
  createProduct: async (product: NewProductRequest): Promise<Product> => {
    return apiCall<Product>("/products", {
      method: "POST",
      json: product,
    });
  },

  // Update a product - Fixed to use the correct endpoint and method
  updateProduct: async (product: UpdateProductRequest): Promise<any> => {
    return apiCall<any>(`/products/${product.product_id}`, {
      method: "PATCH",
      json: product,
    });
  },

  // Delete a product
  deleteProduct: async (productId: number): Promise<string> => {
    return apiCall<string>(`/products/${productId}`, {
      method: "DELETE",
    });
  },

  // Search for products
  getPreSearchedProductsQueryOptions: (keyword: string) => {
    return queryOptions({
      queryKey: ["pre-search-products", keyword],
      queryFn: ({ signal }) => {
        return apiCall<Types.PreSearchedProduct[]>(
          `/search/?keyword=${keyword}&storage_name=products&page=1&size=10`,
          {
            signal,
          },
        );
      },
    });
  },

  // Get signed URLs for uploading images
  // AFTER (correct)
  getSignedUrls: async (
    requests: SignedUrlRequest[],
  ): Promise<SignedUrlResponse[]> => {
    return apiCall<SignedUrlResponse[]>(`/bucket/upload-url`, {
      method: "POST",
      json: requests,
    });
  },

  // Upload an image to the bucket
  uploadImage: async (
    file: File,
    filename: string,
    entityId: number,
    mediaOrder: number,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", filename);
    formData.append("mime_type", file.type);
    formData.append("entity_type", "products"); // products for Kupi&Prodai
    formData.append("entity_id", entityId.toString());
    formData.append("media_format", "carousel");
    formData.append("media_order", mediaOrder.toString());

    const response = await apiCall(`/bucket/upload-image/`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    console.log("response", response);

    return response as string;
  },

  // Check Telegram binding status
  checkTelegramStatus: async (): Promise<{ tg_id: boolean }> => {
    return apiCall<{ tg_id: boolean }>("/me/tg-status");
  },
};
