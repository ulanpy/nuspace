import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { beginLogout } from "@/features/auth/api"

export function useLogout() {
  return useMutation({
    mutationFn: beginLogout,
    onError: () => {
      toast.error("Could not log out. Try again.")
    },
  })
}
