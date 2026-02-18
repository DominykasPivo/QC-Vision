import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { DEFECT_SEVERITIES, TEST_STATUSES, TEST_TYPES, formatEnumLabel } from '@/lib/db-constants';
import { fetchGallery, type GalleryPhoto, type GalleryResponse } from '@/lib/api/gallery';

const PAGE_SIZE = 20;

const SEVERITY_STYLES: Record<string, { border: string; badge: string }> = {
    critical: { border: 'border-red-600 border-2', badge: 'bg-red-200 text-red-900' },
    high: { border: 'border-red-400 border-2', badge: 'bg-red-100 text-red-800' },
    medium: { border: 'border-orange-400 border-2', badge: 'bg-orange-100 text-orange-800' },
    low: { border: 'border-yellow-400 border-2', badge: 'bg-yellow-100 text-yellow-800' },
};

const NO_DEFECT_BORDER = 'border-emerald-400 border';

type CategoryRecord = { id: number; name: string; is_active: boolean };

function GalleryCard({ photo }: { photo: GalleryPhoto }) {
    const style = photo.highest_severity
        ? SEVERITY_STYLES[photo.highest_severity] ?? { border: NO_DEFECT_BORDER, badge: '' }
        : { border: NO_DEFECT_BORDER, badge: '' };

    return (
        <Link
            to={`/photos/${photo.id}`}
            className={`gallery-item relative overflow-hidden rounded-lg ${style.border}`}
            style={{ backgroundColor: '#1f2937' }}
        >
            <img
                src={`/api/v1/photos/${photo.id}/image`}
                alt={`Photo ${photo.id}`}
                className="h-full w-full object-cover"
                loading="lazy"
            />
            {photo.defect_count > 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {photo.defect_count}
                </span>
            )}
            {photo.highest_severity && (
                <span className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                    {formatEnumLabel(photo.highest_severity)}
                </span>
            )}
        </Link>
    );
}

export function Gallery() {
    const [galleryData, setGalleryData] = useState<GalleryResponse | null>(null);
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [severityFilter, setSeverityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [testTypeFilter, setTestTypeFilter] = useState('');
    const [testStatusFilter, setTestStatusFilter] = useState('');
    const [hasDefectsFilter, setHasDefectsFilter] = useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Fetch categories on mount
    useEffect(() => {
        fetch('/api/v1/defects/categories')
            .then((res) => res.json())
            .then((data) => setCategories(data))
            .catch(console.error);
    }, []);

    // Fetch gallery data when filters or page change
    const loadGallery = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchGallery({
                page: currentPage,
                page_size: PAGE_SIZE,
                severity: severityFilter || undefined,
                category_id: categoryFilter ? Number(categoryFilter) : undefined,
                test_type: testTypeFilter || undefined,
                test_status: testStatusFilter || undefined,
                has_defects: hasDefectsFilter ? hasDefectsFilter === 'true' : undefined,
            });
            setGalleryData(data);
        } catch (err) {
            console.error('Failed to fetch gallery:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, severityFilter, categoryFilter, testTypeFilter, testStatusFilter, hasDefectsFilter]);

    useEffect(() => {
        loadGallery();
    }, [loadGallery]);

    const totalPages = galleryData ? Math.max(1, Math.ceil(galleryData.total / PAGE_SIZE)) : 1;
    const photos = galleryData?.items ?? [];

    const hasActiveFilters = severityFilter || categoryFilter || testTypeFilter || testStatusFilter || hasDefectsFilter;

    const clearAllFilters = () => {
        setSeverityFilter('');
        setCategoryFilter('');
        setTestTypeFilter('');
        setTestStatusFilter('');
        setHasDefectsFilter('');
        setCurrentPage(1);
    };

    const setFilterAndResetPage = <T,>(setter: (v: T) => void) => (value: T) => {
        setter(value);
        setCurrentPage(1);
    };

    // Shared select trigger classes (matching TestsList pattern)
    const triggerCls = 'h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100';
    const mobileTriggerCls = 'h-14 rounded-2xl border border-slate-200 bg-white !pl-8 !pr-6 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100';

    return (
        <div className="page">
            <div className="flex flex-col gap-1">
                <h2 className="page-title">Gallery</h2>
                <p className="page-description">Browse all test photos</p>
            </div>

            {/* Mobile: filter button */}
            <div className="mt-4 flex items-center gap-3 md:hidden">
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
                    onClick={() => setMobileFiltersOpen((open) => !open)}
                    aria-label="Open filters"
                >
                    <Filter className="mr-1.5 h-4 w-4" />
                    Filters
                </Button>
            </div>

            {/* Desktop filters */}
            <div className="mt-4 hidden md:block">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                    <Select
                        value={severityFilter || 'all'}
                        onValueChange={(v) => setFilterAndResetPage(setSeverityFilter)(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severities</SelectItem>
                            {DEFECT_SEVERITIES.map((s) => (
                                <SelectItem key={s} value={s}>{formatEnumLabel(s)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={categoryFilter || 'all'}
                        onValueChange={(v) => setFilterAndResetPage(setCategoryFilter)(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={testTypeFilter || 'all'}
                        onValueChange={(v) => setFilterAndResetPage(setTestTypeFilter)(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Test Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {TEST_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{formatEnumLabel(t)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={testStatusFilter || 'all'}
                        onValueChange={(v) => setFilterAndResetPage(setTestStatusFilter)(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Test Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {TEST_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{formatEnumLabel(s)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={hasDefectsFilter || 'all'}
                        onValueChange={(v) => setFilterAndResetPage(setHasDefectsFilter)(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Defects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Photos</SelectItem>
                            <SelectItem value="true">With Defects</SelectItem>
                            <SelectItem value="false">Without Defects</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Mobile filter modal */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/45"
                        aria-label="Close filters"
                        onClick={() => setMobileFiltersOpen(false)}
                    />
                    <div className="relative flex min-h-full items-center justify-center p-4">
                        <div className="flex max-h-[86vh] w-[90%] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[92%] sm:max-w-[520px]">
                            <div className="border-b border-slate-200 px-6 py-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 rounded-full border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100 hover:text-blue-800"
                                    onClick={() => setMobileFiltersOpen(false)}
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Go Back
                                </Button>
                                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Gallery Filters</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">Filter photos by defects, test type, and more</p>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Severity</p>
                                        <Select value={severityFilter || 'all'} onValueChange={(v) => setFilterAndResetPage(setSeverityFilter)(v === 'all' ? '' : v)}>
                                            <SelectTrigger className={mobileTriggerCls}><SelectValue placeholder="Severity" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Severities</SelectItem>
                                                {DEFECT_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{formatEnumLabel(s)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Category</p>
                                        <Select value={categoryFilter || 'all'} onValueChange={(v) => setFilterAndResetPage(setCategoryFilter)(v === 'all' ? '' : v)}>
                                            <SelectTrigger className={mobileTriggerCls}><SelectValue placeholder="Category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Test Type</p>
                                        <Select value={testTypeFilter || 'all'} onValueChange={(v) => setFilterAndResetPage(setTestTypeFilter)(v === 'all' ? '' : v)}>
                                            <SelectTrigger className={mobileTriggerCls}><SelectValue placeholder="Test Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                {TEST_TYPES.map((t) => <SelectItem key={t} value={t}>{formatEnumLabel(t)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Test Status</p>
                                        <Select value={testStatusFilter || 'all'} onValueChange={(v) => setFilterAndResetPage(setTestStatusFilter)(v === 'all' ? '' : v)}>
                                            <SelectTrigger className={mobileTriggerCls}><SelectValue placeholder="Test Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                {TEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{formatEnumLabel(s)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Defects</p>
                                        <Select value={hasDefectsFilter || 'all'} onValueChange={(v) => setFilterAndResetPage(setHasDefectsFilter)(v === 'all' ? '' : v)}>
                                            <SelectTrigger className={mobileTriggerCls}><SelectValue placeholder="Defects" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Photos</SelectItem>
                                                <SelectItem value="true">With Defects</SelectItem>
                                                <SelectItem value="false">Without Defects</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 pb-6 pt-4">
                                <Button
                                    type="button"
                                    className="relative h-14 w-full rounded-2xl text-sm font-bold uppercase tracking-wide"
                                    onClick={() => setMobileFiltersOpen(false)}
                                >
                                    Apply Filters
                                    <Check className="absolute right-4 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-600">Active filters:</span>
                    {severityFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Severity: {formatEnumLabel(severityFilter)}
                        </span>
                    )}
                    {categoryFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Category: {categories.find((c) => String(c.id) === categoryFilter)?.name ?? categoryFilter}
                        </span>
                    )}
                    {testTypeFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Type: {formatEnumLabel(testTypeFilter)}
                        </span>
                    )}
                    {testStatusFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Status: {formatEnumLabel(testStatusFilter)}
                        </span>
                    )}
                    {hasDefectsFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {hasDefectsFilter === 'true' ? 'With Defects' : 'Without Defects'}
                        </span>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                        onClick={clearAllFilters}
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}

            {/* Gallery content */}
            {loading ? (
                <p className="page-description mt-6">Loading photos...</p>
            ) : photos.length === 0 ? (
                <p className="page-description mt-6">
                    {hasActiveFilters
                        ? 'No photos match the selected filters.'
                        : 'No photos yet. Upload photos when creating a test.'}
                </p>
            ) : (
                <>
                    <div className="gallery-grid mt-4">
                        {photos.map((photo) => (
                            <GalleryCard key={photo.id} photo={photo} />
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    );
}
