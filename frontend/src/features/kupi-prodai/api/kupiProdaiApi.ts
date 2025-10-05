import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import { PreSearchedProduct, Product} from "@/features/kupi-prodai/types";
import { QueryParams, NewProductRequest, UpdateProductRequest } from "@/features/kupi-prodai/types";

// Types for the API
export const defaultSize = 20;
export const defaultPage = 1;


export interface PaginatedResponse<T> {
  products: T[];
  total_pages: number;
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
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
      retry: false, // Don't retry failed auth requests
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
      queryFn: async ({ queryKey }) => {
        const [, , params] = queryKey as [string, string, QueryParams];
        let endpoint = `/products?size=${params.size}&page=${params.page}&status=active`;
        if (params.category) endpoint += `&category=${params.category}`;
        if (params.condition) endpoint += `&condition=${params.condition}`;
        if (params.keyword) endpoint += `&keyword=${params.keyword}`;

        const res = await apiCall<any>(endpoint);
        if (
          res &&
          typeof res.total_pages !== "number" &&
          typeof res.num_of_pages === "number"
        ) {
          res.total_pages = res.num_of_pages;
        }
        return res as PaginatedResponse<Product>;
      },
    });
  },

  // Get all products of the current user
  getUserProductsQueryOptions: () => {
    return queryOptions({
      queryKey: [kupiProdaiApi.baseKey, "userProducts"],
      queryFn: async () => {
        const res = await apiCall<any>(
          `/products?size=${defaultSize}&page=${defaultPage}&owner_sub=me`,
        );
        if (
          res &&
          typeof res.total_pages !== "number" &&
          typeof res.num_of_pages === "number"
        ) {
          res.total_pages = res.num_of_pages;
        }
        return res as PaginatedResponse<Product>;
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

  // Check Telegram binding status
  checkTelegramStatus: async (): Promise<{ tg_id: boolean }> => {
    return apiCall<{ tg_id: boolean }>("/me/tg-status");
  },
};
