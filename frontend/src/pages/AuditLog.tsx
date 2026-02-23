// frontend/src/pages/AuditLog.tsx

import { useMemo, useState } from 'react'; 
import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react'; 

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

export function AuditLog() {
    const { auditEvents } = useOutletContext<AppDataContext>();

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({}); 

    const grouped = useMemo(() => {
        const map: Record<string, typeof auditEvents> = {};

        for (const ev of auditEvents) {
            const testId = extractTestId(ev.event) ?? 'other';
            if (!map[testId]) map[testId] = [];
            map[testId].push(ev);
        }

        for (const key of Object.keys(map)) {
            map[key] = [...map[key]].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        }

        const entries = Object.entries(map).sort(([a], [b]) => {
            if (a === 'other') return 1;
            if (b === 'other') return -1;
            // numeric sort if possible
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

            <Card className="audit-list">
                <CardContent className="p-0">
                    {auditEvents.length === 0 ? (
                        <div className="audit-item flex flex-col gap-1">
                            <div className="audit-event">No audit activity yet.</div>
                        </div>
                    ) : (
                        grouped.map(([groupKey, events]) => {
                            const isOpen = openGroups[groupKey] ?? false; 
                            const title =
                                groupKey === 'other' ? 'Other activity' : `Test ${groupKey}`; 

                            return (
                                <div key={groupKey} className="border-b border-slate-200 last:border-b-0">
                                    {}
                                    <button
                                        type="button"
                                        className="audit-item flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between"
                                        onClick={() =>
                                            setOpenGroups((prev) => ({ ...prev, [groupKey]: !isOpen }))
                                        } 
                                        aria-expanded={isOpen} 
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900">{title}</span>
                                            <span className="text-xs text-slate-500">
                                                ({events.length})
                                            </span>
                                            {isOpen ? (
                                                <ChevronUp className="h-4 w-4 text-slate-500" /> 
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-500" /> 
                                            )}
                                        </div>

                                        {}
                                        <div className="audit-timestamp">
                                            {events[0]?.timestamp ? formatTimestamp(events[0].timestamp) : ''}
                                        </div>
                                    </button>

                                    {}
                                    {isOpen && (
                                        <div className="bg-slate-50 px-4 pb-3">
                                            {events.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className="audit-item flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="audit-event">{event.event}</div>
                                                    <div className="audit-timestamp">
                                                        {formatTimestamp(event.timestamp)}
                                                    </div>
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