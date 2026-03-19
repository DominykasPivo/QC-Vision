import type { TestStatus, TestType } from "@/lib/db-constants";

export type UpdateTestPayload = {
  jira_id: string;
  product_name: string;
  test_type: TestType;
  requester: string;
  assigned_to: string | null;
  description: string | null;
  color_ids: number[];
  status: TestStatus;
  deadline_at: string | null;
};

export async function deletePhotoById(photoId: number): Promise<Response> {
  return fetch(`/api/v1/photos/${photoId}`, { method: "DELETE" });
}

export async function updateTestById(
  testId: string | number,
  payload: UpdateTestPayload,
): Promise<Response> {
  return fetch(`/api/v1/tests/${testId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function uploadPhotoForTest(
  testId: string | number,
  file: File,
): Promise<Response> {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`/api/v1/photos/upload?test_id=${testId}`, {
    method: "POST",
    body: formData,
  });
}
