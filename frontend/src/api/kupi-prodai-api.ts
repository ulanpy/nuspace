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

// Updated enums to match backend
export type ProductCondition = "new" | "like_new" | "used"
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
  | "others"
export type ProductStatus = "inactive" | "active" | "sold"

export interface Product {
  id: number
  name: string
  description: string
  price: number
  category:
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
    | "others"
  condition: "new" | "like_new" | "used"
  status: "inactive" | "active"
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
  category:
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
    | "others"
  condition: "new" | "like_new" | "used"
  status: "active"
}

export interface UpdateProductRequest {
  product_id: number
  name?: string
  description?: string
  price?: number
  category?:
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
    | "others"
  condition?: "new" | "like_new" | "used"
  status?: "inactive" | "active"
}

export interface SignedUrl {
  filename: string
  upload_url: string
}

export interface SignedUrlResponse {
  signed_urls: SignedUrl[]
}

// API base URL
const API_BASE_URL = "/api"

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

  // Update a product - Fixed to use the correct endpoint and method
  updateProduct: async (product: UpdateProductRequest): Promise<any> => {
    return apiCall<any>("/products/", "PATCH", product)
  },

  // Delete a product
  deleteProduct: async (productId: number): Promise<string> => {
    return apiCall<string>(`/products/${productId}`, "DELETE")
  },

  // Search for products
  searchProducts: async (keyword: string): Promise<Product[]> => {
    return apiCall<Product[]>(`/products/search/${keyword}`)
  },

  // Get signed URLs for uploading images
  getSignedUrls: async (fileCount: number): Promise<SignedUrlResponse> => {
    return apiCall<SignedUrlResponse>(`/bucket/upload-url?file_count=${fileCount}`)
  },

  // Upload an image to the bucket
  uploadImage: async (file: File, filename: string, entityId: number, mediaOrder: number): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("filename", filename)
    formData.append("mime_type", file.type)
    formData.append("section", "kp") // kp for Kupi&Prodai
    formData.append("entity_id", entityId.toString())
    formData.append("media_purpose", "banner")
    formData.append("media_order", mediaOrder.toString())

    const response = await fetch(`${API_BASE_URL}/bucket/upload-image/`, {
      method: "POST",
      credentials: "include",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Image upload failed")
    }

    return response.json()
  },

  // Check Telegram binding status
  checkTelegramStatus: async (): Promise<{ tg_linked: boolean }> => {
    return apiCall<{ tg_linked: boolean }>("/me")
  },
}
