export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function parseBody(response: Response) {
  const text = await response.text();
  if (!text) {
    return { data: null, text: "" };
  }

  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text };
  }
}

export async function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const { data, text } = await parseBody(response);

  if (!response.ok) {
    const message =
      (data &&
        typeof data === "object" &&
        "detail" in data &&
        String((data as { detail: unknown }).detail)) ||
      (data &&
        typeof data === "object" &&
        "message" in data &&
        String((data as { message: unknown }).message)) ||
      text ||
      "Unexpected response from server. Please try again.";
    throw new ApiError(message, response.status, data ?? text);
  }

  return data as T;
}
