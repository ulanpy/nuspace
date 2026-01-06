import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from '../api/communities-api';
import { usePathname } from "next/navigation";
import { Community, CommunityPermissions } from "@/features/shared/campus/types";

export const useCommunity = () => {
  const pathname = usePathname();
  // Extract ID from pathname for static export compatibility
  // Pattern: /communities/{id} or /communities/{id}/
  const extractedId = pathname?.match(/\/communities\/([^/]+)/)?.[1];
  // Filter out 'placeholder' - it's the static generation placeholder, not a real ID
  const id = extractedId && extractedId !== 'placeholder' ? extractedId : undefined;

  const { data, isPending, isLoading, isError } = useQuery({
    ...campuscurrentAPI.getCommunityQueryOptions(id || ""),
    enabled: !!id,
    // Normalize API response to a consistent shape
    select: (raw: any): { community: Community | null; permissions: CommunityPermissions | null } => {
      const community: Community | null = (raw?.community as Community) ?? (raw as Community) ?? null;
      const permissions: CommunityPermissions | null =
        (raw?.permissions as CommunityPermissions) ??
        ((community as any)?.permissions as CommunityPermissions) ??
        null;
      return { community, permissions };
    },
  });

  return {
    community: (data as any)?.community ?? null,
    permissions: (data as any)?.permissions ?? null,
    isPending,
    isLoading,
    isError,
  };
};
