const AUTH_FAILURE_KEY = "__auth_query_disabled__";

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(AUTH_FAILURE_KEY) !== "true";
}

let queryEnabled = readEnabled();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function getAuthQueryEnabled(): boolean {
  return queryEnabled;
}

export function subscribeAuthQueryEnabled(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function disableAuthQuery(): void {
  if (!queryEnabled) return;
  queryEnabled = false;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(AUTH_FAILURE_KEY, "true");
  }
  emitChange();
}

export function enableAuthQuery(): void {
  if (queryEnabled) return;
  queryEnabled = true;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(AUTH_FAILURE_KEY);
  }
  emitChange();
}
