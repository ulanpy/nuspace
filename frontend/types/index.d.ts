export {}

declare global {
  namespace Types {
    interface ProductImage {
      id: number;
      url: string;
    }

    interface Product {
      id: number;
      title: string;
      price: number;
      category: string;
      condition: "New" | "Used" | "Like New";
      images: ProductImage[];
      seller: string;
      sellerRating?: number;
      location: string;
      likes: number;
      messages: number;
      description?: string;
      telegramUsername?: string;
      datePosted?: string;
      isOwner?: boolean;
      isSold?: boolean;
    }
  }
}