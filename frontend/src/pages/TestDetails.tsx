import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEnumLabel } from '@/lib/db-constants';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEST_STATUSES, TEST_TYPES, type TestStatus, type TestType } from '@/lib/db-constants';

export function TestDetails() {
    const { tests, photos, addAuditEvent, removeTest, removePhotosForTest, updateTest, addPhoto, removePhoto } = useOutletContext<AppDataContext>();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const test = tests.find((t) => t.id === id);
    const [selectedPhoto, setSelectedPhoto] = useState<(typeof photos)[0] | null>(null);
    const testPhotos = useMemo(() => photos.filter((photo) => photo.testId === id), [photos, id]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);
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
        setNewPhotoPreviews([]);
        setPhotoNotice(null);
        setShowUpdateModal(true);
    };

    useEffect(() => {
        const previews = newPhotos.map((file) => ({ file, url: URL.createObjectURL(file) }));
        setNewPhotoPreviews(previews);
        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [newPhotos]);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) {
            return;
        }
        const maxTotal = 6;
        const remaining = Math.max(0, maxTotal - testPhotos.length - newPhotos.length);
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

    const handleUpdateSave = () => {
        updateTest(test.id, {
            externalOrderId: draft.externalOrderId.trim(),
            productType: draft.productType.trim(),
            testType: draft.testType,
            requester: draft.requester.trim(),
            assignedTo: draft.assignedTo.trim() || undefined,
            deadline: draft.deadline,
            status: draft.status,
        });
        newPhotos.forEach((file, index) => {
            addPhoto({
                id: `${test.id}-${file.name}-${file.lastModified}-${index}`,
                testId: test.id,
                color: '#1f2937',
                label: file.name,
                imageUrl: URL.createObjectURL(file),
            });
        });
        addAuditEvent({
            id: `audit-${Date.now()}`,
            event: `Updated Test ${test.id}`,
            timestamp: new Date().toISOString(),
        });
        setShowUpdateModal(false);
    };

    const handleDelete = async () => {
        if (!id || isDeleting) {
            return;
        }
        setIsDeleting(true);
        let apiDeleted = false;
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
            apiDeleted = true;
            removePhotosForTest(id);
            removeTest(id);
            addAuditEvent({
                id: `audit-${Date.now()}`,
                event: `Deleted Test ${id}`,
                timestamp: new Date().toISOString(),
            });
            navigate('/tests');
        } catch (error) {
            removePhotosForTest(id);
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
                            {testPhotos.length === 0 ? (
                                <div className="details-placeholder" />
                            ) : (
                                <div className="gallery-grid">
                                    {testPhotos.map((photo) => (
                                        <div
                                            key={photo.id}
                                            className="gallery-item"
                                            style={{ backgroundColor: photo.color }}
                                            onClick={() => setSelectedPhoto(photo)}
                                        >
                                            {photo.imageUrl ? (
                                                <img
                                                    src={photo.imageUrl}
                                                    alt={photo.label}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <span style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                                    {photo.label}
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

            {selectedPhoto && (
                <div className="modal-overlay flex items-center justify-center" onClick={() => setSelectedPhoto(null)}>
                    <button
                        type="button"
                        className="modal-close text-white"
                        onClick={() => setSelectedPhoto(null)}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                    <div className="modal-content flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-image flex flex-col items-center justify-center">
                            {selectedPhoto.imageUrl ? (
                                <img
                                    src={selectedPhoto.imageUrl}
                                    alt={selectedPhoto.label}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <div
                                    className="flex flex-col items-center text-center"
                                    style={{ color: 'white', backgroundColor: selectedPhoto.color, width: '100%', height: '100%', justifyContent: 'center' }}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{selectedPhoto.label}</div>
                                    <div style={{ opacity: 0.8 }}>Test: {selectedPhoto.testId}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                {(testPhotos.length > 0 || newPhotos.length > 0) && (
                                    <div className="update-photo-section">
                                        {testPhotos.length > 0 && (
                                            <div className="update-photo-group">
                                                <div className="update-photo-label">Existing photos</div>
                                                <div className="update-photo-grid">
                                                    {testPhotos.map((photo) => (
                                                        <div key={photo.id} className="update-photo-card">
                                                            <div className="update-photo-thumb">
                                                                {photo.imageUrl ? (
                                                                    <img src={photo.imageUrl} alt={photo.label} />
                                                                ) : (
                                                                    <span>{photo.label}</span>
                                                                )}
                                                            </div>
                                                            <div className="update-photo-meta">
                                                                <span className="update-photo-name">{photo.label}</span>
                                                                <button
                                                                    type="button"
                                                                    className="update-photo-remove"
                                                                    onClick={() => removePhoto(photo.id)}
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
