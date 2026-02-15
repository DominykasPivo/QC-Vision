import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { formatEnumLabel } from '@/lib/db-constants';
import { type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEST_STATUSES, TEST_TYPES, type TestStatus, type TestType } from '@/lib/db-constants';
import { cn } from '@/lib/utils';

type ApiPhoto = {
    id: number;
    test_id: number;
    file_path: string;
    url?: string;
};

export function TestDetails() {
    const { tests, addAuditEvent, removeTest, updateTest } = useOutletContext<AppDataContext>();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const test = tests.find((t) => t.id === id);
    const [apiPhotos, setApiPhotos] = useState<ApiPhoto[]>([]);
    const [photosWithDefects, setPhotosWithDefects] = useState<Array<ApiPhoto & { defectCount: number }>>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);
    const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
    const [photoNotice, setPhotoNotice] = useState<string | null>(null);
    const [newPhotoPreviews, setNewPhotoPreviews] = useState<{ file: File; url: string }[]>([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const [draft, setDraft] = useState({
        externalOrderId: test?.externalOrderId ?? '',
        productType: test?.productType ?? '',
        testType: (test?.testType ?? 'incoming') as TestType,
        requester: test?.requester ?? '',
        assignedTo: test?.assignedTo ?? '',
        description: test?.description ?? '',
        deadline: test?.deadline ?? '',
        status: (test?.status ?? 'pending') as TestStatus,
    });

    useEffect(() => {
        if (id) {
            fetch(`/api/v1/photos/test/${id}`)
                .then(res => res.json())
                .then(async (data: ApiPhoto[]) => {
                    console.log('Fetched photos from API:', data);
                    const photosWithUrls = await Promise.all(
                        data.map(async (photo: ApiPhoto) => {
                            return { ...photo, url: `/api/v1/photos/${photo.id}/image?t=${Date.now()}` };
                        })
                    );
                    console.log('Photos with URLs:', photosWithUrls);
                    setApiPhotos(photosWithUrls);

                    const photosWithDefectData = await Promise.all(
                        photosWithUrls.map(async (photo: ApiPhoto) => {
                            try {
                                const defectsRes = await fetch(`/api/v1/defects/photo/${photo.id}`);
                                const defects = await defectsRes.json();
                                return { ...photo, defectCount: Array.isArray(defects) ? defects.length : 0 };
                            } catch {
                                return { ...photo, defectCount: 0 };
                            }
                        })
                    );
                    setPhotosWithDefects(photosWithDefectData.filter(p => p.defectCount > 0));
                })
                .catch(err => console.error('Failed to fetch photos:', err));
        }
    }, [id]);

    useEffect(() => {
        const refetchDefects = async () => {
            if (id && apiPhotos.length > 0) {
                try {
                    const photosWithDefectData = await Promise.all(
                        apiPhotos.map(async (photo: ApiPhoto) => {
                            try {
                                const defectsRes = await fetch(`/api/v1/defects/photo/${photo.id}`);
                                const defects = await defectsRes.json();
                                return { ...photo, defectCount: Array.isArray(defects) ? defects.length : 0 };
                            } catch {
                                return { ...photo, defectCount: 0 };
                            }
                        })
                    );
                    setPhotosWithDefects(photosWithDefectData.filter(p => p.defectCount > 0));
                } catch (err) {
                    console.error('Failed to refetch defects:', err);
                }
            }
        };

        window.addEventListener('focus', refetchDefects);
        return () => window.removeEventListener('focus', refetchDefects);
    }, [id, apiPhotos]);

    useEffect(() => {
        const previews = newPhotos.map((file) => ({ file, url: URL.createObjectURL(file) }));
        setNewPhotoPreviews(previews);
        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [newPhotos]);

    if (!test) {
        return (
            <div className="max-w-[420px] w-full mx-auto px-4 py-6">
                <Link to="/tests" className="inline-flex items-center gap-1 text-[var(--primary)] text-sm font-medium no-underline mb-4">
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                    Back to Tests
                </Link>
                <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Test Not Found</h2>
                <p className="text-[var(--text-secondary)] text-sm">The requested test could not be found.</p>
            </div>
        );
    }

    const formatDateOnly = (value?: string | null) => {
        if (!value) {
            return '—';
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return '—';
        }
        return parsed.toISOString().slice(0, 10);
    };

    const productIdValue = test.productId ?? test.externalOrderId;
    const productIdLabel = productIdValue ? String(productIdValue) : '—';
    const requesterLabel = test.requester?.trim() ? test.requester : '—';
    const assignedToLabel = test.assignedTo?.trim() ? test.assignedTo : '—';
    const deadlineSource = test.deadlineAt ?? (test.deadline && test.deadline !== 'None' ? test.deadline : null);
    const deadlineLabel = deadlineSource ? formatDateOnly(deadlineSource) : '—';
    const createdLabel = formatDateOnly(test.createdAt ?? null);
    const updatedLabel = formatDateOnly(test.updatedAt ?? null);

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
            description: test.description ?? '',
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

        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

        const invalidTypeFiles = files.filter(file => !file.type.startsWith('image/'));
        if (invalidTypeFiles.length > 0) {
            setPhotoNotice(`File must be an image`);
            e.target.value = '';
            return;
        }

        const invalidFormatFiles = files.filter(file => !ALLOWED_FORMATS.includes(file.type));
        if (invalidFormatFiles.length > 0) {
            setPhotoNotice(`Unsupported format. Allowed: JPEG, PNG, WEBP`);
            e.target.value = '';
            return;
        }

        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            setPhotoNotice(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
            e.target.value = '';
            return;
        }

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
            if (photosToDelete.length > 0) {
                console.log('Deleting photos...');
                for (const photoIdStr of photosToDelete) {
                    const apiPhoto = apiPhotos.find(p => p.id.toString() === photoIdStr);
                    if (apiPhoto) {
                        try {
                            console.log(`Deleting photo ${apiPhoto.id}`);
                            const response = await fetch(`/api/v1/photos/${apiPhoto.id}`, {
                                method: 'DELETE',
                            });

                            console.log(`Delete photo ${apiPhoto.id} response:`, response.status);
                            if (response.ok) {
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

            console.log('Updating test...');
            const updateData = {
                product_id: draft.externalOrderId.trim(),
                test_type: draft.testType,
                requester: draft.requester.trim(),
                assigned_to: draft.assignedTo.trim() || null,
                description: draft.description.trim() || null,
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

            updateTest(test.id, {
                externalOrderId: draft.externalOrderId.trim(),
                productType: draft.productType.trim(),
                testType: draft.testType,
                requester: draft.requester.trim(),
                assignedTo: draft.assignedTo.trim() || undefined,
                description: draft.description.trim() || null,
                deadline: draft.deadline,
                status: draft.status,
            });

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

                        setApiPhotos(prev => [...prev, { ...photoData, url: `/api/v1/photos/${photoData.id}/image?t=${Date.now()}` }]);
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

            removeTest(id);
            addAuditEvent({
                id: `audit-${Date.now()}`,
                event: `Deleted Test ${id}`,
                timestamp: new Date().toISOString(),
            });
            navigate('/tests');
        } catch (error) {
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

    /* ── status badge color map ── */
    const statusColors: Record<string, string> = {
        pending: 'bg-[#fef3c7] text-[#92400e]',
        open: 'bg-[#e5e7eb] text-[#374151]',
        in_progress: 'bg-[#dbeafe] text-[#1e40af]',
        'in-progress': 'bg-[#dbeafe] text-[#1e40af]',
        finalized: 'bg-[#d1fae5] text-[#065f46]',
    };
    const badgeClass = statusColors[test.status] ?? 'bg-[#e5e7eb] text-[#374151]';

    const hasDescription = Boolean(test.description?.trim());

    return (
        <div
            className="test-details-page min-h-full bg-white px-5 pb-[calc(var(--nav-height)+9rem)] pt-5 sm:px-7 lg:px-0 lg:pb-12 lg:pt-8"
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            <div className="mx-auto w-full max-w-[1640px]">
                <header className="pb-2 lg:pb-3">
                    <Link
                        to="/tests"
                        className="group inline-flex items-center gap-1 text-lg font-bold text-[#2563eb] no-underline"
                    >
                        <MaterialIcon name="chevron_left" className="text-[24px]" />
                        <span className="underline-offset-4 group-hover:underline">Back to Tests</span>
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h1 className="text-5xl font-extrabold tracking-tight text-[#111827]">
                            Test #{test.id}
                        </h1>
                        <span
                            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-[0.2em] ${badgeClass}`}
                        >
                            {formatEnumLabel(test.status)}
                        </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[15px] font-medium text-[#6b7280]">
                        <span>Product ID: {productIdLabel}</span>
                        <span className="inline-flex items-center gap-1.5">
                            <MaterialIcon name="input" className="text-xl" />
                            {formatEnumLabel(test.testType)}
                        </span>
                    </div>
                </header>

                <div className="mt-8 grid grid-cols-1 gap-7 lg:mt-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8 xl:gap-10">
                    <section className="space-y-7">
                        <SurfaceCard>
                            <div className="mb-8 flex items-center gap-3 border-b border-gray-100 pb-5">
                                <MaterialIcon name="info" className="text-3xl text-[#2563eb]" />
                                <h2 className="text-2xl font-bold text-[#111827]">Test Information</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-x-8 gap-y-9 pb-2 md:grid-cols-2 lg:gap-y-10">
                                <InfoItem label="Test ID" value={String(test.id)} valueClassName="text-2xl font-bold text-[#111827]" />
                                <InfoItem label="Product ID" value={productIdLabel} valueClassName="text-2xl font-bold text-[#111827]" />
                                <InfoItem label="Test Type" value={formatEnumLabel(test.testType)} valueClassName="text-[1.5rem] font-bold text-[#1f2937]" />
                                <InfoItem label="Requester" value={requesterLabel} valueClassName="text-[1.5rem] font-bold text-[#2563eb]" />
                                <InfoItem
                                    label="Assigned To"
                                    value={assignedToLabel}
                                    valueClassName={assignedToLabel === '—' ? 'text-[1.5rem] font-bold text-gray-300' : 'text-[1.5rem] font-bold text-[#1f2937]'}
                                />
                                <InfoItem
                                    label="Deadline"
                                    value={deadlineLabel}
                                    valueClassName={deadlineLabel === '—' ? 'text-[1.5rem] font-bold text-gray-300' : 'text-[1.5rem] font-bold text-[#1f2937]'}
                                />

                                <div className="col-span-full">
                                    <p className="mb-1 text-xs font-black uppercase tracking-[0.28em] text-gray-400">Description</p>
                                    <p
                                        className={cn(
                                            'break-words leading-tight',
                                            hasDescription
                                                ? 'text-[1.5rem] font-bold text-[#1f2937]'
                                                : 'text-base font-medium text-gray-400',
                                        )}
                                    >
                                        {hasDescription ? test.description : 'No description provided'}
                                    </p>
                                </div>

                                <div className="col-span-full grid grid-cols-2 gap-5 border-t border-gray-100 pt-7">
                                    <InfoItem label="Created" value={createdLabel} valueClassName="text-sm font-bold text-[#1f2937]" />
                                    <InfoItem label="Last Updated" value={updatedLabel} valueClassName="text-sm font-bold text-[#1f2937]" />
                                </div>
                            </div>
                        </SurfaceCard>
                    </section>

                    <section className="space-y-7 lg:space-y-8">
                        <SurfaceCard>
                            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <MaterialIcon name="collections" className="text-3xl text-[#2563eb]" />
                                    <h2 className="text-2xl font-bold text-[#111827]">Photos</h2>
                                </div>
                                <span className="text-lg font-bold text-[#6b7280]">
                                    {apiPhotos.length} Photo{apiPhotos.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {apiPhotos.length === 0 ? (
                                <div className="cursor-default flex min-h-[220px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 px-5 text-center lg:min-h-[240px]">
                                    <p className="text-xl font-bold text-gray-400">No photos uploaded</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 xl:gap-5">
                                    {apiPhotos.map((photo) => (
                                        <Link
                                            key={photo.id}
                                            to={`/photos/${photo.id}`}
                                            className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100"
                                            aria-label={`Open photo ${photo.id}`}
                                        >
                                            {photo.url ? (
                                                <img
                                                    src={photo.url}
                                                    alt={`Photo ${photo.id}`}
                                                    className="h-full w-full object-cover"
                                                    onLoad={() => console.log(`Image loaded: Photo ${photo.id}`, photo.url)}
                                                    onError={(e) => console.error(`Image failed to load: Photo ${photo.id}`, photo.url, e)}
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs font-medium text-gray-500">
                                                    Loading...
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </SurfaceCard>

                        <SurfaceCard>
                            <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                <MaterialIcon name="warning" className="text-3xl text-red-500" />
                                <h2 className="text-2xl font-bold text-[#111827]">Defects</h2>
                            </div>

                            {photosWithDefects.length === 0 ? (
                                <div className="cursor-default flex min-h-[220px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 px-5 text-center lg:min-h-[240px]">
                                    <p className="text-xl font-bold text-gray-400">No defects reported for this test.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 xl:gap-5">
                                    {photosWithDefects.map((photo) => (
                                        <Link
                                            key={photo.id}
                                            to={`/photos/${photo.id}`}
                                            className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100"
                                        >
                                            {photo.url ? (
                                                <>
                                                    <img
                                                        src={photo.url}
                                                        alt={`Photo ${photo.id}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <div className="absolute bottom-2 right-2 rounded-md bg-red-500 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                                        {photo.defectCount} defect{photo.defectCount !== 1 ? 's' : ''}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs font-medium text-gray-500">
                                                    Loading...
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </SurfaceCard>
                    </section>
                </div>

                <div className="mt-10 lg:mt-12">
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center lg:p-6">
                        <button
                            type="button"
                            onClick={openUpdate}
                            className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#2563eb] text-xl font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition-all hover:bg-[#1d4ed8] active:scale-[0.98] md:flex-1"
                        >
                            <MaterialIcon name="edit" className="text-2xl" />
                            UPDATE TEST
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-500 px-6 text-base font-black text-red-500 transition-all hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                        >
                            <MaterialIcon name="delete" className="text-3xl" />
                            <span>Delete Test</span>
                        </button>
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 className="text-2xl font-bold text-[#111827]">Delete test?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            This will permanently delete the test and its photos.
                        </p>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-xl border-gray-300 px-5 font-semibold text-gray-700"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="h-11 rounded-xl bg-[#dc2626] px-5 font-semibold text-white hover:bg-[#b91c1c]"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateModal && (
                <div
                    className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
                    onClick={() => setShowUpdateModal(false)}
                >
                    <div
                        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.3)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
                            <h3 className="text-2xl font-bold text-[#111827]">Update Test</h3>
                            <p className="mt-1 text-sm text-gray-600">
                                Edit the fields below and save your changes.
                            </p>
                        </div>

                        <div className="max-h-[72vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        External Order
                                    </label>
                                    <Input
                                        className="h-11 rounded-xl border-gray-300 text-gray-900"
                                        value={draft.externalOrderId}
                                        onChange={(e) =>
                                            setDraft((prev) => ({ ...prev, externalOrderId: e.target.value }))
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Product Type
                                    </label>
                                    <Input
                                        className="h-11 rounded-xl border-gray-300 text-gray-900"
                                        value={draft.productType}
                                        onChange={(e) =>
                                            setDraft((prev) => ({ ...prev, productType: e.target.value }))
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Test Type
                                    </label>
                                    <Select
                                        value={draft.testType}
                                        onValueChange={(value) =>
                                            setDraft((prev) => ({ ...prev, testType: value as TestType }))
                                        }
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-gray-300 text-gray-900" id="update-test-type">
                                            <SelectValue placeholder="Select test type" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[260]">
                                            {TEST_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {formatEnumLabel(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Requester
                                    </label>
                                    <Input
                                        className="h-11 rounded-xl border-gray-300 text-gray-900"
                                        value={draft.requester}
                                        onChange={(e) =>
                                            setDraft((prev) => ({ ...prev, requester: e.target.value }))
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Assigned To
                                    </label>
                                    <Input
                                        className="h-11 rounded-xl border-gray-300 text-gray-900"
                                        value={draft.assignedTo}
                                        onChange={(e) =>
                                            setDraft((prev) => ({ ...prev, assignedTo: e.target.value }))
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Deadline
                                    </label>
                                    <Input
                                        type="date"
                                        className="h-11 rounded-xl border-gray-300 text-gray-900"
                                        value={draft.deadline || ''}
                                        onChange={(e) =>
                                            setDraft((prev) => ({ ...prev, deadline: e.target.value }))
                                        }
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#2563eb]"
                                        placeholder="Enter test description"
                                        value={draft.description}
                                        onChange={(e) =>
                                            setDraft((prev) => ({ ...prev, description: e.target.value }))
                                        }
                                        rows={4}
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Status
                                    </label>
                                    <Select
                                        value={draft.status}
                                        onValueChange={(value) =>
                                            setDraft((prev) => ({ ...prev, status: value as TestStatus }))
                                        }
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-gray-300 text-gray-900" id="update-status">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[260]">
                                            {TEST_STATUSES.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {formatEnumLabel(status)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                        Add Photos (up to 6 total)
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 rounded-xl border-gray-300 px-4 font-semibold text-gray-700"
                                        onClick={() => {
                                            if (isMobile) {
                                                setShowPhotoModal(true);
                                            } else {
                                                document.getElementById('desktop-input')?.click();
                                            }
                                        }}
                                    >
                                        {isMobile ? 'Add Photos' : 'Choose Images'}
                                    </Button>
                                    <input
                                        id="camera-input"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        capture="environment"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            handlePhotoSelect(e);
                                            setShowPhotoModal(false);
                                        }}
                                    />
                                    <input
                                        id="gallery-input"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            handlePhotoSelect(e);
                                            setShowPhotoModal(false);
                                        }}
                                    />
                                    <input
                                        id="desktop-input"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoSelect}
                                    />

                                    {photoNotice && (
                                        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                            {photoNotice}
                                        </div>
                                    )}

                                    {(apiPhotos.length > 0 || newPhotos.length > 0) && (
                                        <div className="mt-4 space-y-4">
                                            {apiPhotos.length > 0 && (
                                                <div>
                                                    <p className="mb-2 text-sm font-semibold text-gray-700">
                                                        Existing photos
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                        {apiPhotos
                                                            .filter(
                                                                (photo) =>
                                                                    !photosToDelete.includes(photo.id.toString()),
                                                            )
                                                            .map((photo) => (
                                                                <div
                                                                    key={photo.id}
                                                                    className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                                                                >
                                                                    <div className="aspect-square bg-gray-100">
                                                                        {photo.url ? (
                                                                            <img
                                                                                src={photo.url}
                                                                                alt="Photo"
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="flex h-full items-center justify-center text-xs text-gray-500">
                                                                                Loading...
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-2.5 py-2">
                                                                        <span className="truncate text-xs text-gray-600">
                                                                            {photo.file_path.includes('/')
                                                                                ? photo.file_path
                                                                                      .split('/')
                                                                                      .pop()
                                                                                : `Photo ${photo.id}`}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                                                                            onClick={() =>
                                                                                setPhotosToDelete((prev) => [
                                                                                    ...prev,
                                                                                    photo.id.toString(),
                                                                                ])
                                                                            }
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
                                                <div>
                                                    <p className="mb-2 text-sm font-semibold text-gray-700">
                                                        New photos
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                        {newPhotoPreviews.map((preview, index) => (
                                                            <div
                                                                key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                                                                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                                                            >
                                                                <div className="aspect-square bg-gray-100">
                                                                    <img
                                                                        src={preview.url}
                                                                        alt={preview.file.name}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-2.5 py-2">
                                                                    <span className="truncate text-xs text-gray-600">
                                                                        {preview.file.name}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
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
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-xl border-gray-300 px-5 font-semibold text-gray-700"
                                onClick={() => setShowUpdateModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="h-11 rounded-xl bg-[#2563eb] px-5 font-semibold text-white hover:bg-[#1d4ed8]"
                                onClick={handleUpdateSave}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showPhotoModal && (
                <div
                    className="fixed inset-0 z-[230] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
                    onClick={() => setShowPhotoModal(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.3)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-xl font-bold text-[#111827]">Add Photos</h4>
                        <p className="mt-1 text-sm text-gray-600">Choose how to add photos:</p>
                        <div className="mt-5 flex flex-col gap-2.5">
                            <Button
                                type="button"
                                className="h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]"
                                onClick={() => document.getElementById('camera-input')?.click()}
                            >
                                Take Photo
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-xl border-gray-300 font-semibold text-gray-700"
                                onClick={() => document.getElementById('gallery-input')?.click()}
                            >
                                Choose from Gallery
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-xl border-gray-300 font-semibold text-gray-700"
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

function MaterialIcon({ name, className }: { name: string; className?: string }) {
    return <span className={cn('material-symbols-outlined', className)}>{name}</span>;
}

function SurfaceCard({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-gray-100 bg-white p-7 shadow-sm sm:p-8 lg:p-9',
                className,
            )}
        >
            {children}
        </div>
    );
}

function InfoItem({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div>
            <p className="mb-1 text-xs font-black uppercase tracking-[0.28em] text-gray-400">{label}</p>
            <p className={cn('break-words text-[1.5rem] font-bold leading-tight text-[#1f2937]', valueClassName)}>
                {value}
            </p>
        </div>
    );
}
