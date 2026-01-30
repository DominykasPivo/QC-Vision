import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CreateTest() {
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const MAX_PHOTOS = 6;
    const [formData, setFormData] = useState({
        productId: '',
        testType: '',
        requester: '',
        assignedTo: '',
        deadline: '',
        status: 'pending',
    });

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) {
            return;
        }
        setSelectedPhotos((prev) => {
            const combined = [...prev, ...files];
            return combined.slice(0, MAX_PHOTOS);
        });
        e.target.value = '';
    };

    const handleRemovePhoto = (index: number) => {
        setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadSelectedPhotos = async (testId: string | number | null) => {
        if (selectedPhotos.length === 0) {
            return;
        }
        if (!testId) {
            console.info('Photo upload skipped: missing test id', selectedPhotos);
            return;
        }

        const uploadRequests = selectedPhotos.map(async (file) => {
            const body = new FormData();
            body.append('test_id', String(testId));
            body.append('file', file);

            const response = await fetch('/api/v1/photos/upload', {
                method: 'POST',
                body,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.warn('Photo upload failed:', errorData?.detail || response.statusText);
            }
        });

        await Promise.allSettled(uploadRequests);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/tests/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: parseInt(formData.productId),
                    testType: formData.testType.trim(),
                    requester: formData.requester.trim(),
                    assignedTo: formData.assignedTo.trim() || null,
                    status: formData.status,
                    deadlineAt: formData.deadline ? new Date(formData.deadline).toISOString() : null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create test');
            }

            const createdTest = await response.json();
            const createdTestId =
                createdTest?.id ?? createdTest?.testId ?? createdTest?.data?.id ?? null;

            await uploadSelectedPhotos(createdTestId);
            
            // Show success toast
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                navigate('/tests'); // Redirect to tests list
            }, 2000);

            // Reset form
            setFormData({
                productId: '',
                testType: '',
                requester: '',
                assignedTo: '',
                deadline: '',
                status: 'pending',
            });
            setSelectedPhotos([]);
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
                        <Input
                            type="text"
                            id="testType"
                            name="testType"
                            className="form-input"
                            placeholder="Enter test type"
                            value={formData.testType}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
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
                            disabled={isLoading}
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
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                        disabled={isLoading}
                    >
                        <SelectTrigger id="status" className="form-select">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
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
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={isLoading}
                                >
                                    Choose images
                                </Button>
                                <span className="upload-helper">
                                    Selected {selectedPhotos.length} of {MAX_PHOTOS}
                                </span>
                            </div>
                            <input
                                ref={photoInputRef}
                                id="photo-upload"
                                name="photo-upload"
                                type="file"
                                accept="image/png,image/jpeg"
                                multiple
                                className="upload-input"
                                onChange={handlePhotoSelect}
                                disabled={isLoading}
                                aria-describedby="photo-upload-help"
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
        </div>
    );
}
