// Types for the API
export const defaultSize = 15;
export const defaultPage = 1;

export interface ProductMedia {
  id: number
  url: string
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  category: "books" | "electronics" | "clothing" | "home" | "sports" | "other"
  condition: "new" | "like_new" | "used"
  status: "active" | "sold"
  media: ProductMedia[]
}

export interface NewProductRequest {
  name: string
  description: string
  price: number
  category: "books" | "electronics" | "clothing" | "home" | "sports" | "other"
  condition: "new" | "like_new" | "used"
  status: "active" | "sold"
}

export interface UpdateProductRequest {
  product_id: number
  name?: string
  description?: string
  price?: number
  category?: "books" | "electronics" | "clothing" | "home" | "sports" | "other"
  condition?: "new" | "like_new" | "used"
  status?: "active" | "sold"
}

// API base URL
const API_BASE_URL = "http://localhost/api"

// Helper function for API calls
async function apiCall<T>(endpoint: string, method = "GET", body?: any): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Important for cookies
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.detail || "API request failed")
  }

  return response.json()
}

// API functions
export const kupiProdaiApi = {
  // Get a paginated list of products
  getProducts: async (
    page = 1,
    size = 20,
    category?: string,
    condition?: string
  ): Promise<PaginatedResponse<Product>> => {
    let endpoint = `/products/list?size=${size}&page=${page}`;
    if (category) endpoint += `&category=${category}`;
    if (condition) endpoint += `&condition=${condition}`;
    return apiCall<PaginatedResponse<Product>>(endpoint);
  },


  // Get a specific product by ID
  getProduct: async (productId: number): Promise<Product> => {
    return apiCall<Product>(`/products/${productId}`)
  },

  // Get all products of the current user
  getUserProducts: async (): Promise<Product[]> => {
    return apiCall<Product[]>("/products/user")
  },

  // Create a new product
  createProduct: async (product: NewProductRequest): Promise<Product> => {
    return apiCall<Product>("/products/new", "POST", product)
  },

  // Update a product
  updateProduct: async (product: UpdateProductRequest): Promise<string> => {
    return apiCall<string>(`/products/${product.product_id}`, "PATCH", product)
  },

  // Delete a product
  deleteProduct: async (productId: number): Promise<string> => {
    return apiCall<string>(`/products/${productId}`, "DELETE")
  },

  // Search for products
  searchProducts: async (keyword: string): Promise<Product[]> => {
    return apiCall<Product[]>(`/products/search/${keyword}`)
  },
}

