const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(
    public response: Response,
    public detail?: string,
  ) {
    super(detail ?? `ApiError:${response.status}`);
  }
}

export function getRegistrarErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (
      error.detail === "registrar_unavailable" ||
      error.detail === "registrar_transcript_unavailable" ||
      error.response.status === 502
    ) {
      return "NU Registrar is temporarily unavailable. Please try again later or use PDF upload instead.";
    }
    if (
      error.detail === "invalid_registrar_credentials" ||
      error.response.status === 401
    ) {
      return "Invalid registrar password. Please check your credentials and try again.";
    }
  }
  return fallback;
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
    let detail: string | undefined;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(response, detail);
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
