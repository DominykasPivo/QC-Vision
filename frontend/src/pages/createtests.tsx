import { type FormEvent, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { AppDataContext } from '../components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES, type TestStatus } from '@/lib/db-constants';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const statusTextColor: Record<TestStatus, string> = {
    open: 'text-[#0F172A]',
    in_progress: 'text-[#2563EB]',
    pending: 'text-[#D97706]',
    finalized: 'text-[#16A34A]',
};

const statusLabel: Record<TestStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    pending: 'Pending',
    finalized: 'Finished',
};

export function CreateTestsScreen() {
    const { tests, testsLoaded } = useOutletContext<AppDataContext>();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [testTypeFilter, setTestTypeFilter] = useState('');
    const [assignedToFilter, setAssignedToFilter] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState('');
    const [sortBy, setSortBy] = useState('created_desc');
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSearchQuery(searchInput.trim());
        setCurrentPage(1);
    };

    const filteredTests = useMemo(() => {
        const normalizedQuery = searchQuery.toLowerCase();
        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

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

        const filtered = tests.filter((test) => {
            if (statusFilter && test.status !== statusFilter) {
                return false;
            }

            if (testTypeFilter && test.testType !== testTypeFilter) {
                return false;
            }

            if (assignedToFilter) {
                const assignedTo = test.assignedTo?.toLowerCase() || '';
                if (!assignedTo.includes(assignedToFilter.toLowerCase())) {
                    return false;
                }
            }

            if (!isInDateRange(test.deadlineAt || null)) {
                return false;
            }

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
                statusLabel[test.status],
            ]
                .join(' ')
                .toLowerCase();

            return tokens.every((token) => haystack.includes(token));
        });

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
    }, [currentPage, filteredTests]);

    const showEmptyState = testsLoaded && tests.length === 0;
    const showNoMatches = testsLoaded && tests.length > 0 && filteredTests.length === 0;

    return (
        <div className="min-h-[calc(100dvh-var(--header-height)-var(--nav-height))] bg-gradient-to-b from-[#EEF4FF] to-[#F8FBFF] px-3 py-4 pb-24 md:px-4 md:py-5 md:pb-8">
            {/* White shell card */}
            <section className="w-full rounded-[28px] border-2 border-[#D9E2EF] bg-white px-5 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-8 md:py-8 xl:px-[52px] xl:py-[48px]">
                <div className="flex flex-col gap-5 xl:gap-[34px]">
                    {/* ── Top row: title + new-test button ── */}
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold leading-tight tracking-[-0.02em] text-[#0F172A] md:text-4xl xl:text-[56px]">
                                Tests
                            </h1>
                            <p className="text-base font-medium text-[#64748B] md:text-lg xl:text-[28px]">
                                View and manage quality control tests
                            </p>
                        </div>

                        <Button
                            asChild
                            className="h-14 w-full rounded-full bg-[#2563EB] px-6 text-lg font-semibold text-white hover:bg-[#1D4ED8] lg:h-16 lg:w-[230px] lg:text-[22px]"
                        >
                            <Link to="/create">New Test</Link>
                        </Button>
                    </div>

                    {/* ── Search band ── */}
                    <form
                        className="rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFF] p-4 md:p-5"
                        onSubmit={handleSearchSubmit}
                    >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                            <div className="flex h-[52px] items-center gap-3 rounded-[14px] border border-[#DBE4EF] bg-white px-4 lg:h-[76px] lg:px-5 lg:flex-1">
                                <Search className="h-5 w-5 shrink-0 text-[#94A3B8] lg:h-6 lg:w-6" />
                                <Input
                                    type="text"
                                    value={searchInput}
                                    onChange={(event) => {
                                        const nextValue = event.target.value;
                                        setSearchInput(nextValue);
                                        if (nextValue.trim() === '') {
                                            setSearchQuery('');
                                            setCurrentPage(1);
                                        }
                                    }}
                                    placeholder="Search for ID, Product..."
                                    className="h-full border-0 bg-transparent px-0 text-base font-medium text-slate-700 placeholder:text-[#94A3B8] focus-visible:ring-0 lg:text-lg"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="h-[52px] w-full rounded-[14px] bg-[#2563EB] text-base font-semibold text-white hover:bg-[#1D4ED8] lg:h-[76px] lg:w-[210px] lg:text-[22px]"
                            >
                                Search
                            </Button>
                        </div>
                    </form>

                    {/* ── Filter chips ── */}
                    <div className="flex flex-wrap gap-3 xl:gap-[14px]">
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(value) => {
                                setStatusFilter(value === 'all' ? '' : value);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-11 w-full rounded-full border border-[#BFD2F8] bg-[#EAF1FF] px-5 text-sm font-semibold text-[#1D4ED8] sm:w-auto lg:h-[58px] lg:px-6 lg:text-[20px]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {TEST_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {statusLabel[status]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={testTypeFilter || 'all'}
                            onValueChange={(value) => {
                                setTestTypeFilter(value === 'all' ? '' : value);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[58px] lg:px-6 lg:text-[20px]">
                                <SelectValue placeholder="All Types" />
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
                            value={assignedToFilter}
                            onChange={(event) => {
                                setAssignedToFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Assigned To..."
                            className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] placeholder:text-[#334155] sm:w-auto lg:h-[58px] lg:px-6 lg:text-[20px]"
                        />

                        <Select
                            value={dateRangeFilter || 'all'}
                            onValueChange={(value) => {
                                setDateRangeFilter(value === 'all' ? '' : value);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[58px] lg:px-6 lg:text-[20px]">
                                <SelectValue placeholder="All Deadlines" />
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
                            onValueChange={(value) => {
                                setSortBy(value);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-11 w-full rounded-full border border-[#CFD8E3] bg-white px-5 text-sm font-medium text-[#334155] sm:w-auto lg:h-[58px] lg:px-6 lg:text-[20px]">
                                <SelectValue placeholder="Newest First" />
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

                    {/* ── Recent Tests header ── */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-2xl font-bold text-[#0F172A] md:text-3xl xl:text-[36px]">Recent Tests</h2>
                        <p className="text-base font-medium text-[#64748B] md:text-lg xl:text-[20px]">
                            {filteredTests.length} total tests
                        </p>
                    </div>

                    {/* ── Card grid ── */}
                    {showEmptyState ? (
                        <div className="rounded-[18px] border border-[#D5DFEC] bg-white p-8 text-center">
                            <h3 className="text-2xl font-bold text-slate-900">No tests yet</h3>
                            <p className="mt-2 text-base text-slate-600">Create your first quality control test to get started.</p>
                            <Button asChild className="mt-4 h-12 rounded-xl px-6 text-base font-semibold">
                                <Link to="/create">Create Test</Link>
                            </Button>
                        </div>
                    ) : showNoMatches ? (
                        <div className="rounded-[18px] border border-[#D5DFEC] bg-white p-8 text-center">
                            <p className="text-lg font-semibold text-red-600">No tests match your search or filters.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                                {paginatedTests.map((test) => {
                                    const rawPrimaryId = (test.externalOrderId || test.id).trim();
                                    const primaryId = rawPrimaryId.startsWith('#') ? rawPrimaryId : `#${rawPrimaryId}`;
                                    const productLabel = test.productType?.trim() ? test.productType : formatEnumLabel(test.testType);
                                    const requesterLabel = test.requester?.trim() ? test.requester : 'Unknown requester';

                                    return (
                                        <article
                                            key={test.id}
                                            className="flex flex-col justify-between rounded-[18px] border border-[#D5DFEC] bg-white p-5 md:p-[22px]"
                                        >
                                            <div className="flex flex-col gap-[14px]">
                                                <p className="text-3xl font-bold leading-none text-[#0F172A] md:text-4xl xl:text-[42px]">{primaryId}</p>
                                                <p className="text-xl font-semibold leading-tight text-[#1E293B] md:text-2xl xl:text-[28px]">{productLabel}</p>
                                                <p className={cn('text-base font-semibold md:text-lg xl:text-[20px]', statusTextColor[test.status])}>
                                                    {statusLabel[test.status]}
                                                </p>
                                                <p className="text-sm font-medium text-[#64748B] md:text-base xl:text-[18px]">
                                                    Requester: {requesterLabel}
                                                </p>
                                            </div>

                                            <Button
                                                asChild
                                                className="mt-6 h-[52px] w-full rounded-[12px] bg-[#2563EB] text-base font-semibold text-white hover:bg-[#1D4ED8] md:text-lg"
                                            >
                                                <Link to={`/tests/${test.id}`}>View Details</Link>
                                            </Button>
                                        </article>
                                    );
                                })}
                            </div>

                            {totalPages > 1 && (
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
