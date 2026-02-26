/**
 * Test form utilities
 * Handles form data transformation for API requests
 */

import type { TestStatus, TestType } from "../db-constants";

export type TestFormData = {
  jiraId: string;
  productName: string;
  testType: TestType;
  requester: string;
  assignedTo: string;
  description: string;
  deadline: string;
  status: TestStatus;
};

/**
 * Create a FormData object for test submission with photos
 */
export function buildTestSubmitFormData(
  formData: TestFormData,
  photos: File[],
): FormData {
  const submitFormData = new FormData();

  // Required fields
  submitFormData.append("jiraId", formData.jiraId);
  submitFormData.append("productName", formData.productName);
  submitFormData.append("testType", formData.testType.trim());
  submitFormData.append("requester", formData.requester.trim());

  // Optional fields
  if (formData.assignedTo.trim()) {
    submitFormData.append("assignedTo", formData.assignedTo.trim());
  }

  if (formData.description.trim()) {
    submitFormData.append("description", formData.description.trim());
  }

  // Status normalization
  submitFormData.append(
    "status",
    formData.status.toLowerCase().replace(" ", "_"),
  );

  // Deadline
  if (formData.deadline) {
    submitFormData.append(
      "deadlineAt",
      new Date(formData.deadline).toISOString(),
    );
  }

  // Add photos
  for (const photo of photos) {
    submitFormData.append("photos", photo);
  }

  return submitFormData;
}

/**
 * Create initial/empty test form state
 */
export function createEmptyTestForm(username: string): TestFormData {
  return {
    jiraId: "",
    productName: "",
    testType: "incoming",
    requester: username,
    assignedTo: "",
    description: "",
    deadline: "",
    status: "open",
  };
}

/**
 * Reset test form to initial state
 */
export function resetTestForm(username: string): TestFormData {
  return createEmptyTestForm(username);
}
