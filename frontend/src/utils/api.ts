const API_BASE_URL = "/api";

class ApiError extends Error {
  constructor(public response: Response) {
    super("ApiError:" + response.status);
  }
}
// Helper function for API calls
export const apiCall = async <T>(
  endpoint: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> => {
  let headers = init?.headers ?? {};

  if (init?.json) {
    headers = {
      "Content-Type": "application/json",
      ...headers,
    };

    init.body = JSON.stringify(init.json);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response);
  }

  // Handle empty responses (e.g., 204 No Content) and non-JSON payloads gracefully
  if (response.status === 204 || response.status === 205) {
    return undefined as unknown as T;
  }

  // If server didn't send a body
  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!rawText) {
    return undefined as unknown as T;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText) as T;
    } catch (err) {
      // If backend sends invalid/empty JSON, treat as undefined to avoid hard failure on DELETE
      return undefined as unknown as T;
    }
  }

  // Fallback: return raw text for non-JSON responses
  return rawText as unknown as T;
};
