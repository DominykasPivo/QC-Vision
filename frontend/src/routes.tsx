import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { TestsList } from './pages/TestsList';
import { TestDetails } from './pages/TestDetails';
import { CreateTest } from './pages/CreateTest';
import { Gallery } from './pages/Gallery';
import { AuditLog } from './pages/AuditLog';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppShell />,
        children: [
            {
                index: true,
                element: <Navigate to="/tests" replace />,
            },
            {
                path: 'tests',
                element: <TestsList />,
            },
            {
                path: 'tests/:id',
                element: <TestDetails />,
            },
            {
                path: 'create',
                element: <CreateTest />,
            },
            {
                path: 'gallery',
                element: <Gallery />,
            },
            {
                path: 'audit',
                element: <AuditLog />,
            },
        ],
    },
]);
