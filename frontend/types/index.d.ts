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
    interface Seller {
      sub: string;
      name: string;
      surname: string;
      picture: string;
    }
    interface Permission {
      can_edit: boolean;
      can_delete: boolean;
      editable_fields: string[];
    }
    interface Product {
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

    type NewProductRequest = {
      name: string;
      description: string;
      price: number;
      category: ProductCategory;
      condition: ProductCondition;
      status: string;
    };

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
        picture: string;
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
      tg_id: boolean;
    }
    type PaginatedResponse<T, TKey extends string> = {
      [K in TKey]: T[];
    } & {
      num_of_pages: number;
    };
    // SearchInput
    interface PreSearchedProduct {
      id: number;
      name: string;
      condition: ProductCondition;
      category: ProductCategory;
    }
    type SearchInputProps = {
      inputValue: string;
      setInputValue: (value: string) => void;
      preSearchedProducts: PreSearchedProduct[] | null;
      handleSearch: (inputValue: string) => void;
      setKeyword: (keyword: string) => void;
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
    type SupportedKey = "ArrowDown" | "ArrowUp" | "Enter" | "Escape";
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
    }

    interface DisplayCategory {
      title: string;
      icon: JSX.Element;
    }
  }
  namespace NuEvents {
    interface Media {
      id: number;
      url: string;
    }
    type ClubType =
      | "academic"
      | "professional"
      | "recreational"
      | "cultural"
      | "sports"
      | "social"
      | "art"
      | "technology";
    interface HeadUser {
      sub: string;
      name: string;
      surname: string;
      picture: string;
    }

    interface Permissions {
      can_edit: boolean;
      can_delete: boolean;
      editable_fields: string[];
    }
    interface Club {
      id: number;
      name: string;
      type: ClubType;
      category: string;
      recruitment_status: string;
      description: string;
      head: string;
      established: string;
      telegram_url: string;
      instagram_url: string;
      created_at: string;
      updated_at: string;
      head_user: HeadUser;
      media: Media[];
      permissions: Permissions;
      members: number;
      followers: number;
      isFollowing: boolean;
    }
    type EventPolicy = "all" | "open" | "free_ticket" | "paid_ticket";
    interface Event {
      id: number;
      club_id: number;
      name: string;
      place: string;
      description: string;
      duration: number;
      event_datetime: string;
      policy: EventPolicy;
      category: string;
      created_at: string;
      updated_at: string;
      media: Media[];
      club?: Club;
      rating?: number; // Mock rating for UI
    }
  }
}
