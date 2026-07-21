const REDIRECT_KEY = "__nuspace_redirect_url__";

export function saveIntendedRedirect(path: string): void {
  sessionStorage.setItem(REDIRECT_KEY, path);
}

export function consumeIntendedRedirect(): string | null {
  const saved = sessionStorage.getItem(REDIRECT_KEY);
  if (saved) {
    sessionStorage.removeItem(REDIRECT_KEY);
  }
  return saved;
}
