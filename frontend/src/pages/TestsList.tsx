import { type FormEvent, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { formatEnumLabel, TEST_STATUSES, TEST_TYPES, type TestStatus } from '@/lib/db-constants';

const PAGE_SIZE = 20;

const statusClass: Record<TestStatus, string> = {
    open: 'badge-open',
    in_progress: 'badge-in-progress',
    pending: 'badge-pending',
    finalized: 'badge-finalized',
};

const statusLabel = (status: TestStatus) => formatEnumLabel(status);

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
        <div className="page">
            <h2 className="page-title">Tests</h2>
            <p className="page-description">View and manage quality control tests</p>

            <form
                className="search-filter-bar flex flex-col gap-2"
                onSubmit={handleSearchSubmit}
            >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        type="text"
                        className="form-input flex-1"
                        placeholder="Search tests..."
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
                    <Button type="submit" variant="secondary" className="btn btn-secondary">
                        Search
                    </Button>
                </div>
                
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                        value={statusFilter || 'all'}
                        onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setCurrentPage(1); }}
                    >
                        <SelectTrigger className="form-select">
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
                        <SelectTrigger className="form-select">
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
                        className="form-input"
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
                        <SelectTrigger className="form-select">
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
                        <SelectTrigger className="form-select">
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
            </form>

            {(searchQuery || statusFilter || testTypeFilter || assignedToFilter || dateRangeFilter || sortBy !== 'created_desc') && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {searchQuery && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Search: "{searchQuery}"
                        </span>
                    )}
                    {statusFilter && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Status: {statusLabel(statusFilter as TestStatus)}
                        </span>
                    )}
                    {testTypeFilter && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Type: {formatEnumLabel(testTypeFilter)}
                        </span>
                    )}
                    {assignedToFilter && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Assigned to: {assignedToFilter}
                        </span>
                    )}
                    {dateRangeFilter && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Deadline: {formatEnumLabel(dateRangeFilter)}
                        </span>
                    )}
                    {sortBy !== 'created_desc' && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            Sorted
                        </span>
                    )}
                    <Button
                        type="button"
                        variant="secondary"
                        className="btn btn-secondary text-xs"
                        style={{ padding: '2px 10px', fontSize: '0.75rem' }}
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
                <p className="page-description">No tests yet. Create a test to see it here.</p>
            ) : (
                <>
                    <div className="tests-list">
                        {showNoMatches ? (
                            <p className="page-description">No tests match your search or filters.</p>
                        ) : (
                            paginatedTests.map((test) => (
                                <Link
                                    to={`/tests/${test.id}`}
                                    key={test.id}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <Card className="card">
                                        <CardHeader className="card-header flex-row items-center justify-between p-0">
                                            <CardTitle className="card-title">{test.id}</CardTitle>
                                            <span className={`badge ${statusClass[test.status]}`}>
                                                {statusLabel(test.status)}
                                            </span>
                                        </CardHeader>
                                        <CardContent className="card-meta p-0">
                                            <span>{test.productType}</span>
                                            <span>{test.deadline}</span>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
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
