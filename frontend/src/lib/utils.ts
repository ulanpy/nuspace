import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSearchTextFromURL = (query: string) => {
  const params = new URLSearchParams(query);
  return params.get("text") || "";
}