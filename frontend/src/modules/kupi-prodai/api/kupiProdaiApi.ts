import { apiCall } from "@/api/api";
import { queryOptions } from "@tanstack/react-query";
import { PreSearchedProduct, Product} from "../types";
import { SignedUrlRequest, SignedUrlResponse } from "@/modules/media/types/signed-url.types";
import { QueryParams, NewProductRequest, UpdateProductRequest } from "../types";

// Types for the API
export const defaultSize = 20;
export const defaultPage = 1;


export interface PaginatedResponse<T> {
  products: T[];
  num_of_pages: number;
}


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
      queryFn: () => apiCall<Product>(`/products/${id}`),
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
        return apiCall<PreSearchedProduct[]>(
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
