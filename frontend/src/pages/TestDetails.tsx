import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEnumLabel } from '@/lib/db-constants';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEST_STATUSES, TEST_TYPES, type TestStatus, type TestType } from '@/lib/db-constants';

export function TestDetails() {
    const { tests, addAuditEvent, removeTest, updateTest } = useOutletContext<AppDataContext>();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const test = tests.find((t) => t.id === id);
    const [apiPhotos, setApiPhotos] = useState<Array<{ id: number; test_id: number; file_path: string; url?: string }>>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);
    const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
    const [photoNotice, setPhotoNotice] = useState<string | null>(null);
    const [newPhotoPreviews, setNewPhotoPreviews] = useState<{ file: File; url: string }[]>([]);
    const [draft, setDraft] = useState({
        externalOrderId: test?.externalOrderId ?? '',
        productType: test?.productType ?? '',
        testType: (test?.testType ?? 'incoming') as TestType,
        requester: test?.requester ?? '',
        assignedTo: test?.assignedTo ?? '',
        deadline: test?.deadline ?? '',
        status: (test?.status ?? 'pending') as TestStatus,
    });

    useEffect(() => {
        if (id) {
            fetch(`/api/v1/photos/test/${id}`)
                .then(res => res.json())
                .then(async (data) => {
                    console.log('Fetched photos from API:', data);
                    const photosWithUrls = await Promise.all(
                        data.map(async (photo: any) => {
                            try {
                                console.log(`Fetching URL for photo ${photo.id}`);
                                const urlRes = await fetch(`/api/v1/photos/${photo.id}/url`);
                                console.log(`URL response for photo ${photo.id}:`, urlRes.status);
                                if (urlRes.ok) {
                                    const urlData = await urlRes.json();
                                    console.log(`URL data for photo ${photo.id}:`, urlData);
                                    return { ...photo, url: urlData.url };
                                }
                            } catch (err) {
                                console.error(`Failed to fetch URL for photo ${photo.id}:`, err);
                            }
                            return photo;
                        })
                    );
                    console.log('Photos with URLs:', photosWithUrls);
                    setApiPhotos(photosWithUrls);
                })
                .catch(err => console.error('Failed to fetch photos:', err));
        }
    }, [id]);

    useEffect(() => {
        const previews = newPhotos.map((file) => ({ file, url: URL.createObjectURL(file) }));
        setNewPhotoPreviews(previews);
        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [newPhotos]);

    if (!test) {
        return (
            <div className="page">
                <Link to="/tests" className="back-link">
                    ← Back to Tests
                </Link>
                <h2 className="page-title">Test Not Found</h2>
                <p className="page-description">The requested test could not be found.</p>
            </div>
        );
    }

    const openUpdate = () => {
        const safeTestType = TEST_TYPES.includes(test.testType) ? test.testType : 'incoming';
        const safeStatus = TEST_STATUSES.includes(test.status) ? test.status : 'pending';
        const safeDeadline = test.deadline && test.deadline !== 'None' ? test.deadline : '';
        setDraft({
            externalOrderId: test.externalOrderId ?? '',
            productType: test.productType ?? '',
            testType: safeTestType,
            requester: test.requester ?? '',
            assignedTo: test.assignedTo ?? '',
            deadline: safeDeadline,
            status: safeStatus,
        });
        setNewPhotos([]);
        setPhotosToDelete([]);
        setNewPhotoPreviews([]);
        setPhotoNotice(null);
        setShowUpdateModal(true);
    };

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

        const maxTotal = 6;
        const currentPhotoCount = apiPhotos.length - photosToDelete.length;
        const remaining = Math.max(0, maxTotal - currentPhotoCount - newPhotos.length);
        if (remaining <= 0) {
            setPhotoNotice(`You can upload up to ${maxTotal} photos total.`);
            e.target.value = '';
            return;
        }
        const nextFiles = files.slice(0, remaining);
        if (files.length > remaining) {
            setPhotoNotice(`You can upload up to ${maxTotal} photos total. Extra files were not added.`);
        } else {
            setPhotoNotice(null);
        }
        setNewPhotos((prev) => [...prev, ...nextFiles]);
        e.target.value = '';
    };

    const handleRemoveNewPhoto = (index: number) => {
        setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateSave = async () => {
        console.log('Update button clicked');
        console.log('Photos to delete:', photosToDelete);
        console.log('New photos:', newPhotos);
        console.log('Draft data:', draft);
        
        try {
            // 1. Delete photos marked for deletion
            if (photosToDelete.length > 0) {
                console.log('Deleting photos...');
                for (const photoIdStr of photosToDelete) {
                    // Extract numeric ID from API photos
                    const apiPhoto = apiPhotos.find(p => p.id.toString() === photoIdStr);
                    if (apiPhoto) {
                        try {
                            console.log(`Deleting photo ${apiPhoto.id}`);
                            const response = await fetch(`/api/v1/photos/${apiPhoto.id}`, {
                                method: 'DELETE',
                            });

                            console.log(`Delete photo ${apiPhoto.id} response:`, response.status);
                            if (response.ok) {
                                // Remove from apiPhotos state
                                setApiPhotos(prev => prev.filter(p => p.id !== apiPhoto.id));
                            } else {
                                const errorText = await response.text();
                                console.error(`Failed to delete photo ${apiPhoto.id}:`, errorText);
                            }
                        } catch (error) {
                            console.error(`Error deleting photo ${apiPhoto.id}:`, error);
                        }
                    }
                }
            }

            // 2. Update test in backend
            console.log('Updating test...');
            const updateData = {
                product_id: draft.externalOrderId.trim(),
                test_type: draft.testType,
                requester: draft.requester.trim(),
                assigned_to: draft.assignedTo.trim() || null,
                status: draft.status,
                deadline_at: draft.deadline ? new Date(draft.deadline).toISOString() : null,
            };
            
            console.log('Update data:', updateData);

            const response = await fetch(`/api/v1/tests/${test.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            console.log('Update test response:', response.status);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Update error:', errorData);
                throw new Error(errorData.detail || 'Failed to update test');
            }

            const updatedTest = await response.json();
            console.log('Updated test:', updatedTest);

            // 3. Update local state
            updateTest(test.id, {
                externalOrderId: draft.externalOrderId.trim(),
                productType: draft.productType.trim(),
                testType: draft.testType,
                requester: draft.requester.trim(),
                assignedTo: draft.assignedTo.trim() || undefined,
                deadline: draft.deadline,
                status: draft.status,
            });

            // 4. Upload new photos if any
            if (newPhotos.length > 0) {
                console.log('Uploading new photos...');
                for (const file of newPhotos) {
                    const formData = new FormData();
                    formData.append('file', file);

                    console.log(`Uploading ${file.name}`);
                    const photoResponse = await fetch(`/api/v1/photos/upload?test_id=${test.id}`, {
                        method: 'POST',
                        body: formData,
                    });

                    console.log(`Upload photo ${file.name} response:`, photoResponse.status);
                    if (photoResponse.ok) {
                        const photoData = await photoResponse.json();
                        console.log('Photo uploaded:', photoData);
                        
                        // Fetch the presigned URL for the newly uploaded photo
                        try {
                            const urlRes = await fetch(`/api/v1/photos/${photoData.id}/url`);
                            if (urlRes.ok) {
                                const urlData = await urlRes.json();
                                setApiPhotos(prev => [...prev, { ...photoData, url: urlData.url }]);
                            } else {
                                setApiPhotos(prev => [...prev, photoData]);
                            }
                        } catch (err) {
                            console.error(`Failed to fetch URL for new photo ${photoData.id}:`, err);
                            setApiPhotos(prev => [...prev, photoData]);
                        }
                    } else {
                        const errorText = await photoResponse.text();
                        console.error(`Failed to upload ${file.name}:`, errorText);
                    }
                }
            }

            addAuditEvent({
                id: `audit-${Date.now()}`,
                event: `Updated Test ${test.id}`,
                timestamp: new Date().toISOString(),
            });

            setShowUpdateModal(false);
        } catch (error) {
            console.error('Failed to update test:', error);
            alert(`Failed to update test: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDelete = async () => {
        if (!id || isDeleting) {
            return;
        }
        setIsDeleting(true);
        try {
            const deleteOnce = async (url: string) => {
                const response = await fetch(url, { method: 'DELETE' });
                const text = await response.text();
                return { response, text };
            };

            let { response, text } = await deleteOnce(`/api/v1/tests/${id}`);
            if (!response.ok) {
                ({ response, text } = await deleteOnce(`/api/v1/tests/${id}/`));
            }
            if (!response.ok) {
                throw new Error(text || `Failed to delete test (${response.status})`);
            }
            
            // Remove from local state
            removeTest(id);
            addAuditEvent({
                id: `audit-${Date.now()}`,
                event: `Deleted Test ${id}`,
                timestamp: new Date().toISOString(),
            });
            navigate('/tests');
        } catch (error) {
            // Still remove from local state even if API failed
            removeTest(id);
            addAuditEvent({
                id: `audit-${Date.now()}`,
                event: `Deleted Test ${id}`,
                timestamp: new Date().toISOString(),
            });
            navigate('/tests');
            if (import.meta.env.DEV) {
                console.error('Failed to delete test:', error);
            }
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="page">
            <Link to="/tests" className="back-link">
                ← Back to Tests
            </Link>

            <h2 className="page-title">{test.id}</h2>
            <p className="page-description">{test.productType} • {test.testType}</p>

            <div className="flex flex-col gap-4">
                <Card className="details-section">
                    <CardHeader className="p-0">
                        <CardTitle className="details-section-title">Test Information</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 p-0">
                        <div><strong>External Order:</strong> {test.externalOrderId}</div>
                        <div><strong>Product Type:</strong> {test.productType}</div>
                        <div><strong>Test Type:</strong> {formatEnumLabel(test.testType)}</div>
                        <div><strong>Requester:</strong> {test.requester}</div>
                        {test.assignedTo && <div><strong>Assigned To:</strong> {test.assignedTo}</div>}
                        <div><strong>Deadline:</strong> {test.deadline}</div>
                        <div><strong>Status:</strong> {formatEnumLabel(test.status)}</div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4 md:flex-row">
                    <Card className="details-section flex-1">
                        <CardHeader className="p-0">
                            <CardTitle className="details-section-title">Photos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {apiPhotos.length === 0 ? (
                                <div className="details-placeholder" />
                            ) : (
                                <div className="gallery-grid">
                                    {apiPhotos.map((photo) => (
                                        <div
                                            key={photo.id}
                                            className="gallery-item"
                                            style={{ backgroundColor: '#1f2937' }}
                                        >
                                            {photo.url ? (
                                                <img
                                                    src={photo.url}
                                                    alt={`Photo ${photo.id}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onLoad={() => console.log(`Image loaded: Photo ${photo.id}`, photo.url)}
                                                    onError={(e) => console.error(`Image failed to load: Photo ${photo.id}`, photo.url, e)}
                                                />
                                            ) : (
                                                <span style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                                    Loading...
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="details-section flex-1">
                        <CardHeader className="p-0">
                            <CardTitle className="details-section-title">Defects</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="details-placeholder" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="details-section">
                    <CardHeader className="p-0">
                        <CardTitle className="details-section-title">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" className="btn btn-primary" onClick={openUpdate}>
                                Update
                            </Button>
                            <Button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => {
                                    setShowDeleteConfirm(true);
                                }}
                                disabled={isDeleting}
                            >
                                Delete Test
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {showDeleteConfirm && (
                <div className="modal-overlay flex items-center justify-center" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content delete-confirm" onClick={(event) => event.stopPropagation()}>
                        <div className="delete-confirm__title">Are you sure?</div>
                        <div className="delete-confirm__body">
                            This will permanently delete the test and its photos.
                        </div>
                        <div className="delete-confirm__actions">
                            <Button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                No
                            </Button>
                            <Button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Yes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateModal && (
                <div className="modal-overlay flex items-center justify-center" onClick={() => setShowUpdateModal(false)}>
                    <div className="modal-content delete-confirm update-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="delete-confirm__title">Update Test</div>
                        <div className="delete-confirm__body">Edit the fields below and save your changes.</div>
                        <div className="flex flex-col gap-3 update-modal__fields">
                            <div className="form-group">
                                <label className="form-label">External Order</label>
                                <Input
                                    className="form-input"
                                    value={draft.externalOrderId}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, externalOrderId: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Product Type</label>
                                <Input
                                    className="form-input"
                                    value={draft.productType}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, productType: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Test Type</label>
                                <Select
                                    value={draft.testType}
                                    onValueChange={(value) =>
                                        setDraft((prev) => ({ ...prev, testType: value as TestType }))
                                    }
                                >
                                    <SelectTrigger className="form-select" id="update-test-type">
                                        <SelectValue placeholder="Select test type" />
                                    </SelectTrigger>
                                    <SelectContent className="update-select-content">
                                        {TEST_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {formatEnumLabel(type)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Requester</label>
                                <Input
                                    className="form-input"
                                    value={draft.requester}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, requester: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assigned To</label>
                                <Input
                                    className="form-input"
                                    value={draft.assignedTo}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, assignedTo: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <Input
                                    type="date"
                                    className="form-input"
                                    value={draft.deadline || ''}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, deadline: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <Select
                                    value={draft.status}
                                    onValueChange={(value) =>
                                        setDraft((prev) => ({ ...prev, status: value as TestStatus }))
                                    }
                                >
                                    <SelectTrigger className="form-select" id="update-status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent className="update-select-content">
                                        {TEST_STATUSES.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {formatEnumLabel(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Add Photos (up to 6 total)</label>
                                <Input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    multiple
                                    className="form-input"
                                    onChange={handlePhotoSelect}
                                />
                                {photoNotice && (
                                    <div style={{ color: '#b45309', fontSize: '0.9rem', marginTop: '6px' }}>
                                        {photoNotice}
                                    </div>
                                )}
                                {(apiPhotos.length > 0 || newPhotos.length > 0) && (
                                    <div className="update-photo-section">
                                        {apiPhotos.length > 0 && (
                                            <div className="update-photo-group">
                                                <div className="update-photo-label">Existing photos</div>
                                                <div className="update-photo-grid">
                                                    {apiPhotos
                                                        .filter((photo) => !photosToDelete.includes(photo.id.toString()))
                                                        .map((photo) => (
                                                        <div key={photo.id} className="update-photo-card">
                                                            <div className="update-photo-thumb">
                                                                {photo.url ? (
                                                                    <img src={photo.url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <span>Loading...</span>
                                                                )}
                                                            </div>
                                                            <div className="update-photo-meta">
                                                                <span className="update-photo-name">
                                                                    {photo.file_path.includes('/') ? photo.file_path.split('/').pop() : `Photo ${photo.id}`}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="update-photo-remove"
                                                                    onClick={() => setPhotosToDelete((prev) => [...prev, photo.id.toString()])}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {newPhotoPreviews.length > 0 && (
                                            <div className="update-photo-group">
                                                <div className="update-photo-label">New photos</div>
                                                <div className="update-photo-grid">
                                                    {newPhotoPreviews.map((preview, index) => (
                                                        <div
                                                            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                                                            className="update-photo-card"
                                                        >
                                                            <div className="update-photo-thumb">
                                                                <img src={preview.url} alt={preview.file.name} />
                                                            </div>
                                                            <div className="update-photo-meta">
                                                                <span className="update-photo-name">{preview.file.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="update-photo-remove"
                                                                    onClick={() => handleRemoveNewPhoto(index)}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="delete-confirm__actions" style={{ marginTop: '16px' }}>
                            <Button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="button" className="btn btn-primary" onClick={handleUpdateSave}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
