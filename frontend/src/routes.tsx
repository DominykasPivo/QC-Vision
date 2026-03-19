import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { TestDetails } from "./pages/TestDetails";
import { CreateTest } from "./pages/CreateTest";
import { CreateTestsScreen } from "./pages/createtests";
import { Gallery } from "./pages/Gallery";
import { AuditLog } from "./pages/AuditLog";
import { PhotoDefects } from "./pages/PhotoDefects";
import { Login } from "./pages/Login";
import { isLoggedIn, isReviewer } from "./lib/auth";
import { Review } from "./pages/Review";
import { CameraCapturePage } from "./components/camera";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const loggedIn = isLoggedIn();

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const LoginRoute = () => {
  return isLoggedIn() ? <Navigate to="/tests" replace /> : <Login />;
};

const RequireReviewer = ({ children }: { children: React.ReactNode }) => {
  return isReviewer() ? <>{children}</> : <Navigate to="/tests" replace />;
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginRoute />,
  },
  {
    path: "/",
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
        path: "tests",
        element: <CreateTestsScreen />,
      },
      {
        path: "tests/:id",
        element: <TestDetails />,
      },
      {
        path: "tests/:testId/camera",
        element: <CameraCapturePage />,
      },
      {
        path: "create",
        element: <CreateTest />,
      },
      {
        path: "gallery",
        element: <Gallery />,
      },
      {
        path: "audit",
        element: <AuditLog />,
      },
      {
        path: "photos/:photoId",
        element: <PhotoDefects />,
      },
      {
        path: "review",
        element: (
          <RequireReviewer>
            <Review />
          </RequireReviewer>
        ),
      },
    ],
  },
]);
