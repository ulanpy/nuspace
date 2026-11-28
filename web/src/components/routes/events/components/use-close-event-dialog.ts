import { useNavigate } from "@tanstack/react-router"

/** Back to the board it opened over, with its filters and its scroll position. */
export function useCloseEventDialog() {
  const navigate = useNavigate({ from: "/events/$eventId/" })
  return () => {
    void navigate({
      to: "/events",
      search: (previous) => previous,
      // The board never unmounted; leave it where the visitor had scrolled.
      resetScroll: false,
    })
  }
}
