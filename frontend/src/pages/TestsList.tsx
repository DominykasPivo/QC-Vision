import { type FormEvent, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEnumLabel, TEST_STATUSES, type TestStatus } from '@/lib/db-constants';

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

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSearchQuery(searchInput.trim());
    };

    const filteredTests = useMemo(() => {
        const normalizedQuery = searchQuery.toLowerCase();
        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

        return tests.filter((test) => {
            if (statusFilter && test.status !== statusFilter) {
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
                test.deadline,
                test.status,
                statusLabel(test.status),
            ]
                .join(' ')
                .toLowerCase();

            return tokens.every((token) => haystack.includes(token));
        });
    }, [searchQuery, statusFilter, tests]);

    const showEmptyState = testsLoaded && tests.length === 0;
    const showNoMatches = testsLoaded && tests.length > 0 && filteredTests.length === 0;

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
                            setSearchQuery('');
                        }
                    }}
                />
                <Button type="submit" variant="secondary" className="btn btn-secondary">
                    Search
                </Button>
                <Select
                    value={statusFilter || 'all'}
                    onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
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
                <div className="tests-list">
                    {showNoMatches ? (
                        <p className="page-description">No tests match your search or filters.</p>
                    ) : (
                        filteredTests.map((test) => (
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
            )}
        </div>
    );
}
