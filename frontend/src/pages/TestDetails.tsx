import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { formatEnumLabel } from '@/lib/db-constants';
import { type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TEST_STATUSES, TEST_TYPES, type TestStatus, type TestType } from '@/lib/db-constants';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
        pending: 'bg-yellow-100 text-yellow-800',
        open: 'bg-slate-100 text-slate-700',
        in_progress: 'bg-blue-100 text-blue-800',
        'in-progress': 'bg-blue-100 text-blue-800',
        finalized: 'bg-emerald-100 text-emerald-800',
    };
    const badgeClass = statusColors[test.status] ?? 'bg-slate-100 text-slate-700';

    const hasDescription = Boolean(test.description?.trim());

    return (
        <div
            className="test-details-page relative min-h-full bg-[#f3f4f6] pb-8 md:pb-36"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* ── Sticky Top Bar ── */}
            <div className="sticky top-0 z-10 border-b border-slate-200/50 bg-[#f3f4f6]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
                    <Link
                        to="/tests"
                        className="group inline-flex items-center gap-1 text-lg font-semibold text-[#2563eb] no-underline transition-all hover:underline"
                    >
                        <MaterialIcon name="arrow_back" className="text-xl" />
                        <span>Back to Tests</span>
                    </Link>
                    <span className="hidden text-slate-500 md:block">
                        Test Management System v2.4
                    </span>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 pt-6 md:px-10 md:pt-10">
                {/* ── Hero Section ── */}
                <div className="mb-10">
                    <h1 className="text-5xl font-black text-slate-900">Test #{test.id}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-lg text-slate-500">
                        <span className="flex items-center gap-1">
                            <MaterialIcon name="qr_code" className="text-sm" />
                            Product ID: {productIdLabel}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <MaterialIcon name="login" className="text-sm" />
                            {formatEnumLabel(test.testType)}
                        </span>
                        <Badge
                            className={cn(
                                'ml-2 rounded-full border-0 px-3 py-1 text-sm font-bold uppercase tracking-wider',
                                badgeClass,
                            )}
                        >
                            {formatEnumLabel(test.status)}
                        </Badge>
                    </div>
                </div>

                {/* ── Two Column Grid ── */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* LEFT COLUMN — Test Information */}
                    <section>
                        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-8 py-6">
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <MaterialIcon name="info" className="text-[#2563eb]" />
                                    Test Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 px-8 py-8">
                                <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
                                    <InfoItem label="Test ID" value={String(test.id)} />
                                    <InfoItem label="Product ID" value={productIdLabel} />
                                    <InfoItem label="Test Type" value={formatEnumLabel(test.testType)} />
                                    <InfoItem label="Requester" value={requesterLabel} />
                                    <InfoItem
                                        label="Assigned To"
                                        value={assignedToLabel}
                                        valueClassName={assignedToLabel !== '—' ? 'text-[#2563eb] font-semibold' : 'text-slate-300'}
                                    />
                                    <InfoItem
                                        label="Deadline"
                                        value={deadlineLabel}
                                        valueClassName={deadlineLabel !== '—' ? 'text-red-600 font-semibold' : 'text-slate-300'}
                                    />
                                </div>

                                <Separator className="bg-slate-100" />

                                <div>
                                    <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                                        Description
                                    </p>
                                    <p
                                        className={cn(
                                            'text-xl',
                                            hasDescription
                                                ? 'italic text-slate-700'
                                                : 'text-slate-400',
                                        )}
                                    >
                                        {hasDescription ? `"${test.description}"` : 'No description provided'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-x-4 gap-y-6 border-t border-slate-100 pt-6 md:grid-cols-2">
                                    <InfoItem label="Created" value={createdLabel} valueClassName="text-lg" />
                                    <InfoItem label="Last Updated" value={updatedLabel} valueClassName="text-lg" />
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* RIGHT COLUMN — Photos & Defects */}
                    <section className="space-y-8">
                        {/* Photos Card */}
                        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="flex-row items-center justify-between border-b border-slate-100 px-8 py-6">
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <MaterialIcon name="photo_library" className="text-[#2563eb]" />
                                    Photos
                                </CardTitle>
                                <Badge variant="secondary" className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                                    {apiPhotos.length} Photo{apiPhotos.length !== 1 ? 's' : ''}
                                </Badge>
                            </CardHeader>
                            <CardContent className="px-8 py-8">
                                {apiPhotos.length === 0 ? (
                                    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                        <p className="text-xl font-semibold text-slate-400">No photos uploaded</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                                        {apiPhotos.map((photo) => (
                                            <Link
                                                key={photo.id}
                                                to={`/photos/${photo.id}`}
                                                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl ring-1 ring-slate-200 transition-transform active:scale-95"
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
                                                    <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                                                        Loading...
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <MaterialIcon name="zoom_in" className="text-3xl text-white" />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Defects Card */}
                        <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="border-b border-slate-100 px-8 py-6">
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <MaterialIcon name="report_problem" className="text-red-600" />
                                    Defects
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 py-8">
                                {photosWithDefects.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                                            <MaterialIcon name="check_circle_outline" className="text-4xl text-green-500" />
                                        </div>
                                        <p className="text-xl font-semibold text-slate-500">No defects reported yet</p>
                                        <p className="mt-1 text-slate-400">This product currently meets all quality standards.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 xl:gap-5">
                                        {photosWithDefects.map((photo) => (
                                            <Link
                                                key={photo.id}
                                                to={`/photos/${photo.id}`}
                                                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
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
                                                    <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">
                                                        Loading...
                                                    </div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {/* ── Mobile Action Buttons (inline, below defects) ── */}
                <div className="mt-8 flex flex-col gap-4 md:hidden">
                    <button
                        type="button"
                        onClick={openUpdate}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#2563eb] px-10 py-5 text-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95"
                    >
                        <MaterialIcon name="edit" />
                        UPDATE STATUS
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-600 px-6 py-4 text-lg font-bold text-red-600 transition-all hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <MaterialIcon name="delete_forever" className="text-2xl" />
                        Delete Test
                    </button>
                </div>
            </div>

            {/* ── Fixed Bottom Action Bar (desktop only) ── */}
            <div className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur-xl md:block md:left-[var(--sidebar-width)]">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="hidden items-center gap-4 lg:flex">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Selected Test</span>
                            <span className="text-lg font-bold">Test ID #{test.id} — {formatEnumLabel(test.status)}</span>
                        </div>
                    </div>
                    <div className="flex w-full items-center gap-4 sm:w-auto">
                        <button
                            type="button"
                            onClick={openUpdate}
                            className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-[#2563eb] px-10 py-5 text-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95 sm:flex-none"
                        >
                            <MaterialIcon name="edit" />
                            UPDATE STATUS
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="group flex h-16 w-16 items-center justify-center rounded-xl border-2 border-red-600 text-xl font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:px-8 sm:py-5"
                        >
                            <MaterialIcon name="delete_forever" className="sm:mr-2" />
                            <span className="hidden uppercase sm:inline">Delete Test</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Mobile Menu FAB ── */}
            <div className="fixed right-4 top-4 z-50 md:hidden">
                <button className="rounded-full bg-[#2563eb] p-3 text-white shadow-xl">
                    <MaterialIcon name="menu" />
                </button>
            </div>

            {/* ── Delete Confirmation Modal ── */}
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

            {/* ── Update Modal ── */}
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
                                                                    <div className="flex justify-end border-t border-gray-100 px-2.5 py-2">
                                                                        <button
                                                                            type="button"
                                                                            className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                                                                            aria-label={`Delete image ${photo.id}`}
                                                                            onClick={() =>
                                                                                setPhotosToDelete((prev) => [
                                                                                    ...prev,
                                                                                    photo.id.toString(),
                                                                                ])
                                                                            }
                                                                        >
                                                                            Delete image
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
                                                                <div className="flex justify-end border-t border-gray-100 px-2.5 py-2">
                                                                    <button
                                                                        type="button"
                                                                        className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                                                                        aria-label={`Delete image ${preview.file.name}`}
                                                                        onClick={() => handleRemoveNewPhoto(index)}
                                                                    >
                                                                        Delete image
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

            {/* ── Photo Source Modal (Mobile) ── */}
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
            <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">{label}</p>
            <p className={cn('text-2xl font-semibold text-slate-900', valueClassName)}>
                {value}
            </p>
        </div>
    );
}
