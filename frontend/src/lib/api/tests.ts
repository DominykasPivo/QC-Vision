/**
 * Test API client
 * Centralized API calls for test management
 */

/**
 * Create a new test with photos
 */
export async function createTest(formData: FormData): Promise<{
  test: { id: number | string };
}> {
  const response = await fetch('/api/v1/tests/', {
    method: 'POST',
    body: formData,
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (parsed && (parsed.detail || parsed.message)) ||
      text ||
      `Failed to create test (${response.status})`;
    throw new Error(message);
  }

  return parsed;
}

/**
 * Fetch all tests with optional limit
 */
export async function fetchTests(limit: number = 100): Promise<any> {
  const response = await fetch(`/api/v1/tests/?limit=${limit}`);
  
  if (!response.ok) {
    throw new Error(`Failed to load tests (${response.status})`);
  }

  return response.json();
}

/**
 * Fetch a single test by ID
 */
export async function fetchTestById(testId: string): Promise<any> {
  const response = await fetch(`/api/v1/tests/${testId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to load test (${response.status})`);
  }

  return response.json();
}

/**
 * Delete a test by ID
 */
export async function deleteTest(testId: string): Promise<void> {
  const response = await fetch(`/api/v1/tests/${testId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete test (${response.status})`);
  }
}
