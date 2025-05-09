export {};

declare global {
  namespace Types {
    type ProductCondition = "new" | "like_new" | "used";
    type ProductCategory =
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
    type Status = "inactive" | "active";
    interface Product {
      id: number;
      name: string;
      description: string;
      price: number;
      category: ProductCategory;
      condition: "new" | "like_new" | "used";
      status: Status;
      media: ProductMedia[];
      user_name?: string;
      user_surname?: string;
      created_at?: string;
      updated_at?: string;
    }

    interface NewProductRequest {
      name: string;
      description: string;
      price: number;
      category: ProductCategory;
      condition: ProductCondition;
      status: "active";
    }

    interface ProductMedia {
      id: number;
      url: string;
    }

    type ActiveTab = "buy" | "sell" | "my-listings";

    interface User {
      user: {
        sub: string;
        exp?: number;
        iat?: number;
        auth_time?: number;
        jti?: string;
        iss?: string;
        aud?: string;
        typ?: string;
        azp?: string;
        sid?: string;
        acr?: string;
        name: string;
        given_name: string;
        family_name: string;
        email: string;
        preferred_username: string;
        email_verified?: boolean;
        scope?: string;
        realm_access?: {
          roles: string[];
        };
        resource_access?: {
          account: {
            roles: string[];
          };
        };
      };
      tg_linked: boolean;
    }
    interface PaginatedResponse<T> {
      products: T[];
      num_of_pages: number;
    }
    // SearchInput
    type SearchInputProps = {
      inputValue: string;
      setInputValue: (value: string) => void;
      preSearchedProducts: string[] | null;
      handleSearch: (inputValue: string) => void;
      setSelectedCondition?: (condition: string) => void;
    };
    type KeyActions = Record<string, () => void>;
    type InputHandlers = {
      change: (e: React.ChangeEvent<HTMLInputElement>) => void;
      keyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
      focus: () => void;
      blur: () => void;
    };
    type SearchHandlers = {
      selectItem: (item: string) => void;
      keyActions: KeyActions;
      input: InputHandlers;
    };
    type SupportedKey = 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape'
    type SelectedCondition = "All Conditions" | "new" | "used";

    interface TeamContact {
      icon: JSX.Element;
      link: string;
    }

    interface Team {
      name: string;
      imgLink: string;
      role: string;
      contacts: TeamContact[];
    }

    interface TeamMemberCardProps {
      team: Team;
    }T
  }
}
