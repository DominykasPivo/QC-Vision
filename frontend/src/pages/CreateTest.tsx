import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES, type TestStatus, type TestType } from '@/lib/db-constants';
import type { AppDataContext } from '../components/layout/AppShell';
import { getStoredUsername } from '@/lib/auth';

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
        productId: '',
        testType: 'incoming' as TestType,
        requester: loggedInUser,
        assignedTo: '',
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
            
            submitFormData.append('productId', formData.productId);
            submitFormData.append('testType', formData.testType.trim());
            submitFormData.append('requester', formData.requester.trim());
            if (formData.assignedTo.trim()) {
                submitFormData.append('assignedTo', formData.assignedTo.trim());
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
                productId: '',
                testType: 'incoming',
                requester: loggedInUser,
                assignedTo: '',
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
                <div className="form-group">
                    <label className="form-label" htmlFor="productId">
                        Product ID
                    </label>
                    <Input
                        type="number"
                        id="productId"
                        name="productId"
                        className="form-input"
                        placeholder="e.g. 12345"
                        value={formData.productId}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
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
                        <SelectTrigger id="status" className="form-select">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {TEST_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {formatEnumLabel(status)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="photo-upload">
                        Photos (Optional)
                    </label>
                    <div className="upload-card">
                        <div className="upload-card-inner">
                            <div className="upload-header">
                                <svg className="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    />
                                    <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                <div>
                                    <div className="upload-title">Upload photos for this test</div>
                                    <div className="upload-helper" id="photo-upload-help">
                                        PNG/JPG, up to {MAX_PHOTOS} files
                                    </div>
                                </div>
                            </div>
                            <div className="upload-actions">
                                <Button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handlePhotoButtonClick}
                                    disabled={isLoading}
                                >
                                    {isMobile ? '📷 Add Photos' : 'Choose images'}
                                </Button>
                                <span className="upload-helper">
                                    Selected {selectedPhotos.length} of {MAX_PHOTOS}
                                </span>
                            </div>
                            {/* Hidden inputs */}
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                multiple
                                className="upload-input"
                                onChange={handlePhotoSelect}
                                disabled={isLoading}
                            />
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="upload-input"
                                onChange={handlePhotoSelect}
                                disabled={isLoading}
                            />
                            <input
                                ref={desktopInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="upload-input"
                                onChange={handlePhotoSelect}
                                disabled={isLoading}
                            />
                            {selectedPhotos.length > 0 && (
                                <div className="upload-list" aria-live="polite">
                                    {selectedPhotos.map((file, index) => (
                                        <div key={`${file.name}-${file.lastModified}-${index}`} className="upload-item">
                                            <span className="upload-file-name">{file.name}</span>
                                            <button
                                                type="button"
                                                className="upload-remove"
                                                onClick={() => handleRemovePhoto(index)}
                                                aria-label={`Remove ${file.name}`}
                                                disabled={isLoading}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Test'}
                </Button>
            </form>

            {showToast && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded shadow-lg">
                    ✓ Test created successfully! Redirecting...
                </div>
            )}

            {showPhotoModal && (
                <div className="modal-overlay flex items-center justify-center" onClick={() => setShowPhotoModal(false)}>
                    <div className="modal-content delete-confirm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '300px' }}>
                        <div className="delete-confirm__title">Add Photos</div>
                        <div className="delete-confirm__body">Choose how to add photos:</div>
                        <div className="flex flex-col gap-2" style={{ marginTop: '16px' }}>
                            <Button
                                type="button"
                                className="btn btn-primary btn-block"
                                onClick={() => {
                                    cameraInputRef.current?.click();
                                }}
                            >
                                📷 Take Photo
                            </Button>
                            <Button
                                type="button"
                                className="btn btn-secondary btn-block"
                                onClick={() => {
                                    galleryInputRef.current?.click();
                                }}
                            >
                                🖼️ Choose from Gallery
                            </Button>
                            <Button
                                type="button"
                                className="btn btn-secondary btn-block"
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
