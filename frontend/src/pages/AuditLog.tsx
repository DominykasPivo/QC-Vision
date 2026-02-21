import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { spacing } from '@/lib/ui/spacing';
import { cn } from '@/lib/utils';

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
        <div className={cn(spacing.pageContainer, spacing.pageStack, 'max-w-5xl')}>
            <header className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Audit Log</h2>
                <p className="text-sm text-slate-600 md:text-base">Track all system events and changes</p>
            </header>

            <Card className={spacing.cardShell}>
                <CardContent className="p-0">
                    {auditEvents.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-slate-600 md:px-6">No audit activity yet.</div>
                    ) : (
                        auditEvents.map((event, index) => (
                            <div
                                key={event.id}
                                className={cn(
                                    'flex flex-col gap-1 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6',
                                    index < auditEvents.length - 1 ? 'border-b border-slate-200' : '',
                                )}
                            >
                                <div className="text-sm text-slate-900 md:text-base">{event.event}</div>
                                <div className="text-xs text-slate-500 md:text-sm">{formatTimestamp(event.timestamp)}</div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
