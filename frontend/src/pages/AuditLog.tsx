import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';

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

export function AuditLog() {
    const { auditEvents } = useOutletContext<AppDataContext>();
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
                        auditEvents.map((event) => (
                            <div
                                key={event.id}
                                className="audit-item flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="audit-event">{event.event}</div>
                                <div className="audit-timestamp">{formatTimestamp(event.timestamp)}</div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
