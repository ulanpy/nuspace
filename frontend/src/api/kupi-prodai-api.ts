// Types for the API
export const defaultSize = 15
export const defaultPage = 1

export interface ProductMedia {
  id: number
  url: string
}

export interface PaginatedResponse<T> {
  products: T[]
  num_of_pages: number
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  category: "books" | "electronics" | "clothing" | "home" | "sports" | "other"
  condition: "new" | "like_new" | "used"
  status: "active" | "inactive"
  media: ProductMedia[]
  user_name?: string
  user_surname?: string
  created_at?: string
  updated_at?: string
}

export interface NewProductRequest {
  name: string
  description: string
  price: number
  category: "books" | "electronics" | "clothing" | "home" | "sports" | "other"
  condition: "new" | "like_new" | "used"
  status: "active"
}

export interface UpdateProductRequest {
  product_id: number
  name?: string
  description?: string
  price?: number
  category?: "books" | "electronics" | "clothing" | "home" | "sports" | "other"
  condition?: "new" | "like_new" | "used"
  status?: "active" | "inactive"
}

// API base URL
const API_BASE_URL = "http://localhost/api"

async function apiCall<T>(endpoint: string, method = "GET", body?: any): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const text = await response.text()

  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    // Не JSON — логируем как текст
    if (!response.ok) {
      console.error("Server returned non-JSON error:", text)
      throw new Error(`Server error ${response.status}: ${text}`)
    }
    console.error("Invalid JSON from server:", text)
    throw new Error("Invalid JSON response")
  }

  if (!response.ok) {
    const detail = json?.detail || JSON.stringify(json)
    throw new Error(`API error ${response.status}: ${detail}`)
  }

  return json as T
}


// API functions
export const kupiProdaiApi = {
  // Get a paginated list of products
  getProducts: async (
    page = defaultPage,
    size = defaultSize,
    category?: string,
    condition?: string,
  ): Promise<PaginatedResponse<Product>> => {
    let endpoint = `/products/list?size=${size}&page=${page}`
    if (category) endpoint += `&category=${category}`
    if (condition) endpoint += `&condition=${condition}`
    return apiCall<PaginatedResponse<Product>>(endpoint)
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
    return apiCall<string>(`/products/`, "PATCH", product)
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

