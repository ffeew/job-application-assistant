// Base API client with error handling
class ApiError extends Error {
  constructor(
    message: string, 
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      // Use default error message if JSON parsing fails
    }

    throw new ApiError(errorMessage, response.status, response);
  }

  // Handle empty responses (like DELETE operations)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  
  post: <T>(url: string, data?: unknown) => 
    apiRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: <T>(url: string, data: unknown) => 
    apiRequest<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: <T>(url: string) => 
    apiRequest<T>(url, {
      method: 'DELETE',
    }),
};

export { ApiError };