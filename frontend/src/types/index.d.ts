import type { JSX } from "react";
export {};

declare global {
  namespace Types {

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
    type PaginatedResponse<T, TKey extends string = "items"> = {
      items: T[];
      total_pages: number;
    } & (TKey extends "items" ? {} : { [K in TKey]?: T[] });

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
      icon: React.ComponentType<{ className?: string }>;
    }
  }
  
}

declare module "*.svg" {
  const src: string;
  export default src;
}
