
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetchAuditLogs } from '../api/audit';

function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function extractTestId(eventText: string): string | null {
    const patterns = [
        /test\s*#?\s*(\d+)/i,
        /test[_\s-]*id\s*[:=]\s*(\d+)/i,
        /\btestId\s*[:=]\s*(\d+)/i,
    ];

    for (const re of patterns) {
        const match = eventText.match(re);
        if (match?.[1]) return match[1];
    }
    return null;
}

type UiAuditEvent = {
    id: number | string;
    event: string;
    timestamp: string;
    testId?: number; 
};

function toUiEvent(item: any): UiAuditEvent {
    const base = `${item.action} ${item.entity_type} ${item.entity_id}`;
    const metaSummary =
        item?.meta && typeof item.meta === 'object'
            ? item.meta.summary || item.meta.message || item.meta.description
            : null;

    const metaTestId =
        item?.meta && typeof item.meta === 'object' && item.meta.test_id != null
            ? Number(item.meta.test_id)
            : undefined;

    const directTestId =
        item?.entity_type === 'Test' ? Number(item.entity_id) : undefined;

    return {
        id: item.id,
        event: metaSummary ? String(metaSummary) : base,
        timestamp: item.created_at,
        testId: directTestId ?? metaTestId, 
    };
}

export function AuditLog() {
    const { auditEvents: initialAuditEvents } = useOutletContext<AppDataContext>();

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    // Filters
    const [entityType, setEntityType] = useState<string>('');
    const [entityId, setEntityId] = useState<string>('');
    const [action, setAction] = useState<string>('');
    const [username, setUsername] = useState<string>('');

    const [auditEvents, setAuditEvents] = useState<UiAuditEvent[]>(
        (initialAuditEvents as any[])?.map((e) => ({
            id: e.id,
            event: e.event,
            timestamp: e.timestamp,
        })) ?? []
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchLogs(opts?: { clearFilters?: boolean }) {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchAuditLogs({
                action: action.trim() || undefined,
                entity_type: entityType.trim() || undefined,
                entity_id: entityId.trim() || undefined,
                username: username.trim() || undefined,
                clear_filters: opts?.clearFilters,
                limit: 200,
                offset: 0,
            });

            const items = Array.isArray(data?.items) ? data.items : [];
            setAuditEvents(items.map(toUiEvent));
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchLogs();
    }, []);

    const grouped = useMemo(() => {
        const map: Record<string, UiAuditEvent[]> = {};

        for (const ev of auditEvents) {
            const groupId =
                ev.testId != null
                    ? String(ev.testId) 
                    : extractTestId(ev.event) ?? 'other';

            if (!map[groupId]) map[groupId] = [];
            map[groupId].push(ev);
        }

        for (const key of Object.keys(map)) {
            map[key] = [...map[key]].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        }

        const entries = Object.entries(map).sort(([a], [b]) => {
            if (a === 'other') return 1;
            if (b === 'other') return -1;
            return Number(a) - Number(b);
        });

        return entries;
    }, [auditEvents]);

    return (
        <div className="page">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="page-title">Audit Log</h2>
                    <p className="page-description">Track all system events and changes</p>
                </div>
            </div>

            {}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Entity Type</label>
                    <select
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="Test">Test</option>
                        <option value="Photo">Photo</option>
                        <option value="Defect">Defect</option>
                        <option value="Album">Album</option>
                        <option value="User">User</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Entity ID</label>
                    <input
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm sm:w-40"
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                        placeholder="e.g. 1"
                        inputMode="numeric"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Action</label>
                    <input
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        placeholder="e.g. UPLOAD"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Username</label>
                    <input
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. system"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white"
                        onClick={() => fetchLogs()}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Apply'}
                    </button>

                    <button
                        type="button"
                        className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900"
                        onClick={() => {
                            setEntityType('');
                            setEntityId('');
                            setAction('');
                            setUsername('');
                            fetchLogs({ clearFilters: true });
                        }}
                        disabled={loading}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <Card className="audit-list mt-4">
                <CardContent className="p-0">
                    {auditEvents.length === 0 ? (
                        <div className="audit-item">
                            {loading ? 'Loading audit activity...' : 'No audit activity yet.'}
                        </div>
                    ) : (
                        grouped.map(([groupKey, events]) => {
                            const isOpen = openGroups[groupKey] ?? false;
                            const title = groupKey === 'other' ? 'Other activity' : `Test ${groupKey}`;

                            return (
                                <div key={groupKey} className="border-b border-slate-200 last:border-b-0">
                                    <button
                                        type="button"
                                        className="audit-item flex w-full justify-between"
                                        onClick={() =>
                                            setOpenGroups((prev) => ({ ...prev, [groupKey]: !isOpen }))
                                        }
                                        aria-expanded={isOpen}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{title}</span>
                                            <span className="text-xs text-slate-500">({events.length})</span>
                                            {isOpen ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </div>

                                        <div>{events[0]?.timestamp ? formatTimestamp(events[0].timestamp) : ''}</div>
                                    </button>

                                    {isOpen && (
                                        <div className="bg-slate-50 px-4 pb-3">
                                            {events.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className="audit-item flex justify-between"
                                                >
                                                    <div>{event.event}</div>
                                                    <div>{formatTimestamp(event.timestamp)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}