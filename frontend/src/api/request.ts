const API_BASE_URL = "http://api";

type FetchOptions = RequestInit & {
  params?: Record<string, string | number>;
};

export async function request<T>(
  endpoint: string,
  { params, headers, ...options }: FetchOptions = {}
): Promise<T> {
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const url = new URL(`${API_BASE_URL}/${cleanEndpoint}`);

  if (params) {
    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, String(params[key]))
    );
  }

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  try {
    const response = await fetch(url, {
      headers: defaultHeaders,
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Ошибка ${response.status}: ${response.text}`);
    }

    return response.json();
  } catch (err) {
    console.log(`Ошибка запроса: ${err}`);

    throw err;
  }
}
