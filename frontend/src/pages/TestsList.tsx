import { type FormEvent, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { ArrowLeft, Check, CheckCircle2, CircleDot, Clock3, Filter, FolderOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES, type TestStatus } from '@/lib/db-constants';

const PAGE_SIZE = 20;

const statusClass: Record<TestStatus, { accent: string; badge: string; icon: typeof CircleDot }> = {
    open: {
        accent: 'bg-slate-400',
        badge: 'border-slate-300 bg-slate-100 text-slate-700',
        icon: FolderOpen,
    },
    in_progress: {
        accent: 'bg-sky-500',
        badge: 'border-sky-300 bg-sky-100 text-sky-700',
        icon: CircleDot,
    },
    pending: {
        accent: 'bg-orange-500',
        badge: 'border-orange-300 bg-orange-100 text-orange-800',
        icon: Clock3,
    },
    finalized: {
        accent: 'bg-emerald-500',
        badge: 'border-emerald-300 bg-emerald-100 text-emerald-800',
        icon: CheckCircle2,
    },
};

const statusLabel = (status: TestStatus) => formatEnumLabel(status);
const statusFilterChipClass: Record<TestStatus, string> = {
    open: 'border-slate-300 bg-slate-100 text-slate-700',
    in_progress: 'border-sky-300 bg-sky-100 text-sky-700',
    pending: 'border-orange-300 bg-orange-100 text-orange-800',
    finalized: 'border-emerald-300 bg-emerald-100 text-emerald-800',
};

export function TestsList() {
    const { tests, testsLoaded } = useOutletContext<AppDataContext>();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [testTypeFilter, setTestTypeFilter] = useState('');
    const [assignedToFilter, setAssignedToFilter] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState('');
    const [sortBy, setSortBy] = useState('created_desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSearchQuery(searchInput.trim());
        setCurrentPage(1);
    };

    const filteredTests = useMemo(() => {
        const normalizedQuery = searchQuery.toLowerCase();
        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
        
        // Helper function for date filtering
        const isInDateRange = (testDeadline: string | null) => {
            if (!dateRangeFilter || !testDeadline) return true;
            
            const deadline = new Date(testDeadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            switch (dateRangeFilter) {
                case 'overdue': {
                    return deadline < today;
                }
                case 'today': {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return deadline >= today && deadline < tomorrow;
                }
                case 'this_week': {
                    const weekEnd = new Date(today);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return deadline >= today && deadline < weekEnd;
                }
                case 'this_month': {
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    return deadline >= today && deadline <= monthEnd;
                }
                case 'next_month': {
                    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                    return deadline >= nextMonthStart && deadline <= nextMonthEnd;
                }
                default:
                    return true;
            }
        };

        let filtered = tests.filter((test) => {
            // Status filter
            if (statusFilter && test.status !== statusFilter) {
                return false;
            }

            // Test type filter
            if (testTypeFilter && test.testType !== testTypeFilter) {
                return false;
            }

            // Assigned to filter
            if (assignedToFilter) {
                const assignedTo = test.assignedTo?.toLowerCase() || '';
                if (!assignedTo.includes(assignedToFilter.toLowerCase())) {
                    return false;
                }
            }

            // Date range filter
            if (!isInDateRange(test.deadlineAt || null)) {
                return false;
            }

            // Text search
            if (tokens.length === 0) {
                return true;
            }

            const haystack = [
                test.id,
                test.externalOrderId,
                test.productType,
                test.testType,
                test.requester,
                test.assignedTo || '',
                test.deadline,
                test.status,
                statusLabel(test.status),
            ]
                .join(' ')
                .toLowerCase();

            return tokens.every((token) => haystack.includes(token));
        });

        // Sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'deadline_asc': {
                    const dateA = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
                    const dateB = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
                    return dateA - dateB;
                }
                case 'deadline_desc': {
                    const dateA = a.deadlineAt ? new Date(a.deadlineAt).getTime() : -Infinity;
                    const dateB = b.deadlineAt ? new Date(b.deadlineAt).getTime() : -Infinity;
                    return dateB - dateA;
                }
                case 'created_asc': {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateA - dateB;
                }
                case 'created_desc': {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                }
                case 'status': {
                    return a.status.localeCompare(b.status);
                }
                case 'id_asc': {
                    return String(a.id).localeCompare(String(b.id));
                }
                case 'id_desc': {
                    return String(b.id).localeCompare(String(a.id));
                }
                default:
                    return 0;
            }
        });

        return filtered;
    }, [searchQuery, statusFilter, testTypeFilter, assignedToFilter, dateRangeFilter, sortBy, tests]);

    const totalPages = Math.max(1, Math.ceil(filteredTests.length / PAGE_SIZE));
    const paginatedTests = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredTests.slice(start, start + PAGE_SIZE);
    }, [filteredTests, currentPage]);

    const showEmptyState = testsLoaded && tests.length === 0;
    const showNoMatches = testsLoaded && tests.length > 0 && filteredTests.length === 0;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-6 pt-3 sm:space-y-7 sm:px-3">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:hidden">Tests</h1>
                <div className="hidden md:block">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Tests</h1>
                </div>
                <p className="text-sm text-slate-600 sm:text-base">View and manage quality control tests</p>
            </div>

            <form
                className="mb-4 rounded-none border-0 bg-transparent p-0 shadow-none sm:mb-5 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-5 sm:shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
                onSubmit={handleSearchSubmit}
            >
                <div className="space-y-4 md:hidden">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <Input
                                type="text"
                                className="h-14 rounded-full border border-slate-200 bg-white !pl-8 !pr-4 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                style={{ paddingLeft: '1.75rem', paddingRight: '1rem' }}
                                placeholder="Search by ID or Product..."
                                value={searchInput}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setSearchInput(nextValue);
                                    if (nextValue.trim() === '') {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }
                                }}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-11 w-11 shrink-0 rounded-full p-0 text-sm font-semibold"
                            aria-label="Search tests"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-11 shrink-0 rounded-full border-slate-300 bg-white p-0 text-slate-700 shadow-sm"
                            onClick={() => setMobileFiltersOpen((open) => !open)}
                            aria-label="Open filters"
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="mb-4 space-y-2">
                        <p className="text-sm font-semibold text-slate-700">Status Filter</p>
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                        >
                            <SelectTrigger
                                className="h-12 rounded-full border border-slate-200 bg-white !pl-8 !pr-7 text-base font-medium text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-blue-400 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:mr-0.5 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-slate-500 [&>svg]:opacity-100"
                                style={{ paddingLeft: '1.75rem', paddingRight: '2rem' }}
                            >
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
                                <SelectItem className="rounded-xl px-3 py-2.5 text-base text-slate-900 focus:bg-slate-100" value="all">All Statuses</SelectItem>
                                {TEST_STATUSES.map((status) => (
                                    <SelectItem className="rounded-xl px-3 py-2.5 text-base text-slate-900 focus:bg-slate-100" key={status} value={status}>
                                        {statusLabel(status)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                <div className="hidden md:block">
                    <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
                        <div className="relative flex-1">
                            <Input
                                type="text"
                                className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-[15px] leading-5 text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                placeholder="Search by ID or Product..."
                                value={searchInput}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setSearchInput(nextValue);
                                    if (nextValue.trim() === '') {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }
                                }}
                            />
                        </div>
                        <Button type="submit" className="h-14 rounded-full px-8 text-base font-semibold md:min-w-32">
                            Search
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {TEST_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {statusLabel(status)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={testTypeFilter || 'all'}
                            onValueChange={(value) => { setTestTypeFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                <SelectValue placeholder="Test Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {TEST_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {formatEnumLabel(type)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            type="text"
                            className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="Assigned to..."
                            value={assignedToFilter}
                            onChange={(event) => {
                                setAssignedToFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                        />

                        <Select
                            value={dateRangeFilter || 'all'}
                            onValueChange={(value) => { setDateRangeFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                <SelectValue placeholder="Deadline" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Deadlines</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="today">Due Today</SelectItem>
                                <SelectItem value="this_week">Due This Week</SelectItem>
                                <SelectItem value="this_month">Due This Month</SelectItem>
                                <SelectItem value="next_month">Due Next Month</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={sortBy}
                            onValueChange={(value) => { setSortBy(value); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-14 rounded-full border border-slate-200 bg-white !pl-6 !pr-5 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="created_desc">Newest First</SelectItem>
                                <SelectItem value="created_asc">Oldest First</SelectItem>
                                <SelectItem value="deadline_asc">Deadline: Soonest</SelectItem>
                                <SelectItem value="deadline_desc">Deadline: Latest</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="id_asc">ID: A-Z</SelectItem>
                                <SelectItem value="id_desc">ID: Z-A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </form>

            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/45"
                        aria-label="Close advanced filters"
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
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Advanced Filters</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Choose filters to narrow down your tests</p>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Type</p>
                                    <Select
                                        value={testTypeFilter || 'all'}
                                        onValueChange={(value) => { setTestTypeFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl border border-slate-200 bg-white !pl-8 !pr-6 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                            <SelectValue placeholder="Test Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            {TEST_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {formatEnumLabel(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Assigned To</p>
                                        <Input
                                            type="text"
                                            className="h-14 rounded-2xl border border-slate-200 bg-white !pl-8 !pr-6 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-400 focus-visible:ring-0"
                                            placeholder="Assigned to..."
                                            value={assignedToFilter}
                                            onChange={(event) => {
                                                setAssignedToFilter(event.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Deadline</p>
                                    <Select
                                        value={dateRangeFilter || 'all'}
                                        onValueChange={(value) => { setDateRangeFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl border border-slate-200 bg-white !pl-8 !pr-6 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                            <SelectValue placeholder="Deadline" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Deadlines</SelectItem>
                                            <SelectItem value="overdue">Overdue</SelectItem>
                                            <SelectItem value="today">Due Today</SelectItem>
                                            <SelectItem value="this_week">Due This Week</SelectItem>
                                            <SelectItem value="this_month">Due This Month</SelectItem>
                                            <SelectItem value="next_month">Due Next Month</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Sort By</p>
                                    <Select
                                        value={sortBy}
                                        onValueChange={(value) => { setSortBy(value); setCurrentPage(1); }}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl border border-slate-200 bg-white !pl-8 !pr-6 text-base text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-slate-500 [&>svg]:opacity-100">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="created_desc">Newest First</SelectItem>
                                            <SelectItem value="created_asc">Oldest First</SelectItem>
                                            <SelectItem value="deadline_asc">Deadline: Soonest</SelectItem>
                                            <SelectItem value="deadline_desc">Deadline: Latest</SelectItem>
                                            <SelectItem value="status">Status</SelectItem>
                                            <SelectItem value="id_asc">ID: A-Z</SelectItem>
                                            <SelectItem value="id_desc">ID: Z-A</SelectItem>
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

            {(searchQuery || statusFilter || testTypeFilter || assignedToFilter || dateRangeFilter || sortBy !== 'created_desc') && (
                <div className="mt-10 pt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-600">Active filters:</span>
                    {searchQuery && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Search: "{searchQuery}"
                        </span>
                    )}
                    {statusFilter && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusFilterChipClass[statusFilter as TestStatus]}`}>
                            Status: {statusLabel(statusFilter as TestStatus)}
                        </span>
                    )}
                    {testTypeFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Type: {formatEnumLabel(testTypeFilter)}
                        </span>
                    )}
                    {assignedToFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Assigned to: {assignedToFilter}
                        </span>
                    )}
                    {dateRangeFilter && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Deadline: {formatEnumLabel(dateRangeFilter)}
                        </span>
                    )}
                    {sortBy !== 'created_desc' && (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            Sorted
                        </span>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                        onClick={() => {
                            setSearchInput('');
                            setSearchQuery('');
                            setStatusFilter('');
                            setTestTypeFilter('');
                            setAssignedToFilter('');
                            setDateRangeFilter('');
                            setSortBy('created_desc');
                            setCurrentPage(1);
                        }}
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}

            {showEmptyState ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">No tests yet</h2>
                    <p className="mt-2 text-sm text-slate-600">Create your first quality control test to get started.</p>
                    <Button asChild className="mt-4 h-11 rounded-full px-6 font-semibold">
                        <Link to="/create">Create Test</Link>
                    </Button>
                </div>
            ) : (
                <>
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Recent Tests</h2>
                        {showNoMatches ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <p className="text-base font-semibold text-red-600">No tests match your search or filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                {paginatedTests.map((test) => {
                                    const styles = statusClass[test.status];
                                    const StatusIcon = styles.icon;
                                    const productLabel = test.productType?.trim() ? test.productType : formatEnumLabel(test.testType);
                                    const requesterLabel = test.requester?.trim() ? test.requester : null;
                                    const deadlineLabel = test.deadline?.trim() ? test.deadline : null;
                                    const rawPrimaryId = (test.externalOrderId || test.id).trim();
                                    const primaryId = rawPrimaryId.startsWith('#') ? rawPrimaryId : `#${rawPrimaryId}`;

                                    return (
                                        <article
                                            key={test.id}
                                            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60"
                                        >
                                            <div className={`absolute inset-y-0 left-0 w-1.5 ${styles.accent}`} />
                                            <div className="space-y-4 pr-5 pl-9 py-5" style={{ paddingLeft: '2.25rem' }}>
                                                <div className="relative min-h-14 pr-36">
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                                                            External Order ID
                                                        </p>
                                                        <p className="text-4xl font-bold leading-none text-slate-900">
                                                            {primaryId}
                                                        </p>
                                                        {test.externalOrderId && (
                                                            <p className="text-xs font-medium text-slate-500">Test ID: {test.id}</p>
                                                        )}
                                                    </div>
                                                    <span className={`absolute right-5 top-2 inline-flex min-h-9 w-auto items-center gap-1.5 rounded-full border pl-3.5 pr-4 py-2 text-xs font-semibold leading-none whitespace-nowrap ${styles.badge}`}>
                                                        <StatusIcon className="h-3.5 w-3.5" />
                                                        {statusLabel(test.status)}
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-700">
                                                    <p className="text-[1.65rem] font-semibold leading-tight text-slate-900">{productLabel}</p>
                                                    {requesterLabel && <p className="text-sm">Requester: {requesterLabel}</p>}
                                                    {deadlineLabel && <p className="text-sm">Deadline: {deadlineLabel}</p>}
                                                </div>

                                                <Button asChild className="h-11 w-full rounded-full text-base font-semibold">
                                                    <Link to={`/tests/${test.id}`}>View Details</Link>
                                                </Button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
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
