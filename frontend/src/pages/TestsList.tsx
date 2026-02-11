import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { formatEnumLabel, TEST_STATUSES, type TestStatus } from '@/lib/db-constants';
import { request } from '@/lib/api/http';

const PAGE_SIZE = 20;

const statusClass: Record<TestStatus, string> = {
    open: 'badge-open',
    in_progress: 'badge-in-progress',
    pending: 'badge-pending',
    finalized: 'badge-finalized',
};

const statusLabel = (status: TestStatus) => formatEnumLabel(status);

interface ApiTest {
    id: number;
    product_id: number;
    test_type: string;
    requester: string;
    assigned_to?: string | null;
    status: string;
    deadline_at?: string | null;
    created_at: string;
    updated_at: string;
}

interface PaginatedResponse {
    items: ApiTest[];
    total: number;
    limit: number;
    offset: number;
}

interface DisplayTest {
    id: string;
    productType: string;
    status: TestStatus;
    deadline: string;
}

function toDisplayTest(raw: ApiTest): DisplayTest {
    const deadlineAt = raw.deadline_at;
    let deadline = 'None';
    if (deadlineAt) {
        const parsed = new Date(deadlineAt);
        deadline = Number.isNaN(parsed.getTime()) ? deadlineAt : parsed.toISOString().slice(0, 10);
    }

    return {
        id: String(raw.id),
        productType: `Product ${raw.product_id}`,
        status: (TEST_STATUSES.includes(raw.status as TestStatus) ? raw.status : 'pending') as TestStatus,
        deadline,
    };
}

export function TestsList() {
    const [searchParams, setSearchParams] = useSearchParams();

    const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
    const statusFilter = searchParams.get('status') || '';
    const searchQuery = searchParams.get('search') || '';

    const [searchInput, setSearchInput] = useState(searchQuery);
    const [tests, setTests] = useState<DisplayTest[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const fetchTests = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', String(PAGE_SIZE));
            params.set('offset', String((currentPage - 1) * PAGE_SIZE));
            if (statusFilter) {
                params.set('status', statusFilter);
            }
            if (searchQuery) {
                params.set('search', searchQuery);
            }

            const data = await request<PaginatedResponse>(`/api/v1/tests/?${params.toString()}`);
            setTests(data.items.map(toDisplayTest));
            setTotal(data.total);
        } catch (error) {
            console.error('[TestsList] Failed to fetch tests:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter, searchQuery]);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const updateParams = (updates: Record<string, string>) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(updates)) {
                if (value) {
                    next.set(key, value);
                } else {
                    next.delete(key);
                }
            }
            return next;
        });
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        updateParams({ search: searchInput.trim(), page: '' });
    };

    const handleStatusChange = (value: string) => {
        updateParams({ status: value === 'all' ? '' : value, page: '' });
    };

    const handlePageChange = (page: number) => {
        updateParams({ page: page === 1 ? '' : String(page) });
    };

    const showEmptyState = !loading && total === 0 && !statusFilter && !searchQuery;
    const showNoMatches = !loading && total === 0 && (!!statusFilter || !!searchQuery);

    return (
        <div className="page">
            <h2 className="page-title">Tests</h2>
            <p className="page-description">View and manage quality control tests</p>

            <form
                className="search-filter-bar flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={handleSearchSubmit}
            >
                <Input
                    type="text"
                    className="form-input flex-1"
                    placeholder="Search tests..."
                    value={searchInput}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setSearchInput(nextValue);
                        if (nextValue.trim() === '') {
                            updateParams({ search: '', page: '' });
                        }
                    }}
                />
                <Button type="submit" variant="secondary" className="btn btn-secondary">
                    Search
                </Button>
                <Select
                    value={statusFilter || 'all'}
                    onValueChange={handleStatusChange}
                >
                    <SelectTrigger className="form-select">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {TEST_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                                {statusLabel(status)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </form>

            {showEmptyState ? (
                <p className="page-description">No tests yet. Create a test to see it here.</p>
            ) : (
                <>
                    <div className="tests-list">
                        {showNoMatches ? (
                            <p className="page-description">No tests match your search or filters.</p>
                        ) : (
                            tests.map((test) => (
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
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
}
