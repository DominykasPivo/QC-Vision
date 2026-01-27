import { useMemo, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { auditEvents as initialAuditEvents, tests as initialTests } from '../../mock/data';
import type { AuditEvent, Test } from '../../mock/data';

export type AppDataContext = {
    tests: Test[];
    auditEvents: AuditEvent[];
    addTest: (test: Test) => void;
    addAuditEvent: (event: AuditEvent) => void;
};

export function AppShell() {
    const [tests, setTests] = useState<Test[]>(initialTests);
    const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialAuditEvents);

    const addTest = (test: Test) => {
        setTests((prev) => [test, ...prev]);
    };

    const addAuditEvent = (event: AuditEvent) => {
        setAuditEvents((prev) => [event, ...prev]);
    };

    const contextValue = useMemo(
        () => ({
            tests,
            auditEvents,
            addTest,
            addAuditEvent,
        }),
        [tests, auditEvents],
    );

    return (
        <div className="app-shell">
            <header className="app-header">
                <h1>QC Vision</h1>
            </header>

            <main className="app-content">
                <Outlet context={contextValue} />
            </main>

            <nav className="bottom-nav">
                <NavLink
                    to="/tests"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                    </svg>
                    <span>Tests</span>
                </NavLink>

                <NavLink
                    to="/create"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Create</span>
                </NavLink>

                <NavLink
                    to="/gallery"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span>Gallery</span>
                </NavLink>

                <NavLink
                    to="/audit"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Audit</span>
                </NavLink>
            </nav>
        </div>
    );
}
