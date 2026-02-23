import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatEnumLabel,
  TEST_STATUSES,
  TEST_TYPES,
  type TestStatus,
  type TestType,
} from "@/lib/db-constants";
import type { AppDataContext } from "../components/layout/AppShell";
import { getStoredUsername } from "@/lib/auth";
import { spacing } from "@/lib/ui/spacing";
import { cn } from "@/lib/utils";

export function CreateTest() {
    const navigate = useNavigate();
    const { addAuditEvent, refreshTests } = useOutletContext<AppDataContext>();
    const [showToast, setShowToast] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [photoNotice, setPhotoNotice] = useState<string | null>(null);
    const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);
    const desktopInputRef = useRef<HTMLInputElement | null>(null);
    const MAX_PHOTOS = 6;
    
    // Detect if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const loggedInUser = getStoredUsername();
    const [formData, setFormData] = useState({
        gyraId: '',
        productName: '',
        testType: 'incoming' as TestType,
        requester: loggedInUser,
        assignedTo: '',
        description: '',
        deadline: '',
        status: 'open' as TestStatus,
    });

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) {
            return;
        }

        // Backend validation rules from PhotoService
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

        // Validate file types (must start with 'image/')
        const invalidTypeFiles = files.filter(file => !file.type.startsWith('image/'));
        if (invalidTypeFiles.length > 0) {
            setPhotoNotice(`File must be an image`);
            e.target.value = '';
            return;
        }

        // Validate specific formats (JPEG, PNG, WEBP only)
        const invalidFormatFiles = files.filter(file => !ALLOWED_FORMATS.includes(file.type));
        if (invalidFormatFiles.length > 0) {
            setPhotoNotice(`Unsupported format. Allowed: JPEG, PNG, WEBP`);
            e.target.value = '';
            return;
        }

        // Validate file sizes
        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            setPhotoNotice(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
            e.target.value = '';
            return;
        }

        // Validate not empty
        const emptyFiles = files.filter(file => file.size === 0);
        if (emptyFiles.length > 0) {
            setPhotoNotice(`File is empty`);
            e.target.value = '';
            return;
        }

        setSelectedPhotos((prev) => {
            const combined = [...prev, ...files];
            if (combined.length > MAX_PHOTOS) {
                setPhotoNotice(`You can upload up to ${MAX_PHOTOS} photos. Extra files were not added.`);
            } else {
                setPhotoNotice(null);
            }
            return combined.slice(0, MAX_PHOTOS);
        });
        e.target.value = '';
        setShowPhotoModal(false);
    };

    const handlePhotoButtonClick = () => {
        if (isMobile) {
            setShowPhotoModal(true);
        } else {
            desktopInputRef.current?.click();
        }
    };

    const handleRemovePhoto = (index: number) => {
        setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const submitFormData = new FormData();
            
            submitFormData.append('gyraId', formData.gyraId);
            submitFormData.append('productName', formData.productName);
            submitFormData.append('testType', formData.testType.trim());
            submitFormData.append('requester', formData.requester.trim());
            if (formData.assignedTo.trim()) {
                submitFormData.append('assignedTo', formData.assignedTo.trim());
            }
            if (formData.description.trim()) {
                submitFormData.append('description', formData.description.trim());
            }
            submitFormData.append(
    'status',
    formData.status.toLowerCase().replace(' ', '_')
);

            if (formData.deadline) {
                submitFormData.append('deadlineAt', new Date(formData.deadline).toISOString());
            }
            
            // Add photos (if any)
            for (const photo of selectedPhotos) {
                submitFormData.append('photos', photo);
            }

            // Single request to create test + upload photos
            const response = await fetch('/api/v1/tests/', {
                method: 'POST',
                body: submitFormData,
            });

const text = await response.text();
const parsed = text ? JSON.parse(text) : null;

if (!response.ok) {
    // FastAPI often returns {"detail": "..."} but sometimes body can be empty
    const message =
        (parsed && (parsed.detail || parsed.message)) ||
        text ||
        `Failed to create test (${response.status})`;
    throw new Error(message);
}

const result = parsed;
console.log('Test created:', result);


            const createdTestId = result?.test?.id ? String(result.test.id) : 'unknown';
            
            addAuditEvent({
                id: `audit-${Date.now()}`,
                event: `Created test ${createdTestId}`,
                timestamp: new Date().toISOString(),
            });
            
            // Refresh tests from API to show the new test
            console.log('Refreshing tests...');
            await refreshTests();
            console.log('Tests refreshed successfully');
            
            // Show success toast
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                navigate('/tests'); // Redirect to tests list
            }, 2000);

            // Reset form
            setFormData({
                gyraId: '',
                productName: '',
                testType: 'incoming',
                requester: loggedInUser,
                assignedTo: '',
                description: '',
                deadline: '',
                status: 'open',
            });
            setSelectedPhotos([]);
            setPhotoNotice(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create test');
            console.error('Error creating test:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="page">
            <h2 className="page-title">Create Test</h2>
            <p className="page-description">Create a new quality control test</p>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            {photoNotice && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded mb-4">
                    {photoNotice}
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="gyraId">
                            Gyra ID
                        </label>
                        <Input
                            type="text"
                            id="gyraId"
                            name="gyraId"
                            className="form-input"
                            placeholder="e.g. GY-12345"
                            value={formData.gyraId}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="productName">
                            Product Name
                        </label>
                        <Input
                            type="text"
                            id="productName"
                            name="productName"
                            className="form-input"
                            placeholder="e.g. Blue Polo Shirt"
                            value={formData.productName}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="testType">
                            Test Type
                        </label>
                        <Select
                            value={formData.testType}
                            onValueChange={(value) =>
                                setFormData((prev) => ({ ...prev, testType: value as TestType }))
                            }
                            disabled={isLoading}
                        >
                            <SelectTrigger id="testType" className="form-select">
                                <SelectValue placeholder="Select test type" />
                            </SelectTrigger>
                            <SelectContent>
                                {TEST_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {formatEnumLabel(type)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="requester">
                            Requester
                        </label>
                        <Input
                            type="text"
                            id="requester"
                            name="requester"
                            className="form-input"
                            placeholder="Enter requester name"
                            value={formData.requester}
                            onChange={handleChange}
                            required
                            disabled
                            readOnly
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="assignedTo">
                            Assigned To (Optional)
                        </label>
                        <Input
                            type="text"
                            id="assignedTo"
                            name="assignedTo"
                            className="form-input"
                            placeholder="Enter assignee name"
                            value={formData.assignedTo}
                            onChange={handleChange}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="deadline">
                            Deadline
                        </label>
                        <Input
                            type="date"
                            id="deadline"
                            name="deadline"
                            className="form-input"
                            value={formData.deadline}
                            onChange={handleChange}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="description">
                        Description (Optional)
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        className="form-input"
                        placeholder="Enter test description"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        disabled={isLoading}
                        rows={3}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="status">
                        Status
                    </label>
                    <Select
                        value={formData.status}
                        onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, status: value as TestStatus }))
                        }
                        disabled={isLoading}
                    >
                      <div className="aspect-square bg-slate-100">
                        <img
                          src={preview.url}
                          alt={preview.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="border-t border-slate-100 p-2">
                        <button
                          type="button"
                          className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-200"
                          onClick={() => handleRemovePhoto(index)}
                          aria-label={`Remove image ${preview.file.name}`}
                          disabled={isLoading}
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={spacing.actionRow}>
              <Button
                type="submit"
                density="spacious"
                className="h-16 w-full rounded-3xl bg-[#2563eb] text-lg font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8] focus-visible:ring-4 focus-visible:ring-[#2563eb]/30 focus-visible:ring-offset-0"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Test"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-[calc(var(--nav-height)+1rem)] left-4 right-4 z-[210] rounded-xl border border-green-300 bg-green-100 px-6 py-3 text-center text-sm font-medium text-green-700 shadow-lg sm:left-auto sm:right-6 sm:max-w-sm">
          Test created successfully! Redirecting...
        </div>
      )}

      {showPhotoModal && (
        <div
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900">Add Photos</h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose how to add photos:
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
                onClick={() => {
                  cameraInputRef.current?.click();
                }}
              >
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-300 font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  galleryInputRef.current?.click();
                }}
              >
                Choose from Gallery
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-300 font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => setShowPhotoModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
