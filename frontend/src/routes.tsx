import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { TestDetails } from './pages/TestDetails';
import { CreateTest } from './pages/CreateTest';
import { CreateTestsScreen } from './pages/createtests';
import { Gallery } from './pages/Gallery';
import { AuditLog } from './pages/AuditLog';
import { PhotoDefects } from './pages/PhotoDefects';
import { Login } from './pages/Login';
import { isLoggedIn } from './lib/auth';
import { Review } from './pages/Review';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    if (!isLoggedIn()) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const LoginRoute = () => {
    return isLoggedIn() ? <Navigate to="/tests" replace /> : <Login />;
};

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginRoute />,
    },
    {
        path: '/',
        element: (
            <RequireAuth>
                <AppShell />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/tests" replace />,
            },
            {
                path: 'tests',
                element: <CreateTestsScreen />,
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
            {
                path: 'photos/:photoId',
                element: <PhotoDefects />,
            },
            {
                path: 'review',
                element: <Review />,
            },
        ],
    },
]);
