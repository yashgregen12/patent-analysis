import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { Loading } from "./components/Loading";

// Lazy load pages
const Login = lazy(() => import("./pages/Login"));

// Applicant pages
const ApplicantDashboard = lazy(() => import("./pages/applicant/Dashboard"));

// Attorney pages
const AttorneyDashboard = lazy(() => import("./pages/attorney/Dashboard"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminCreateIP = lazy(() => import("./pages/admin/CreateIP"));
const AdminViewUsers = lazy(() => import("./pages/admin/ViewUsers"));
const AdminViewIPs = lazy(() => import("./pages/admin/ViewIPs"));
const AdminAuthorizeAttorney = lazy(() =>
  import("./pages/admin/AuthorizeAttorney")
);

// Common pages
const IPDetail = lazy(() => import("./pages/IPDetail"));
const IPDetails = lazy(() => import("./pages/IPDetails"));

const RootRedirect = () => {
  return <Navigate to="/login" replace />;
};

// Main layout wrapper
const MainLayout = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />

                {/* ✅ Public routes (Login standalone) */}
                <Route
                  path="/login"
                  element={<Login />}
                />

                {/* ✅ Routes with Sidebar Layout */}
                <Route element={<MainLayout />}>
                  {/* Public IPs - accessible to everyone but shown in layout */}
                  <Route path="/ips" element={<IPDetails />} />
                  <Route path="/ips/:id" element={<IPDetails />} />

                  {/* ✅ Applicant */}
                  <Route
                    element={<ProtectedRoute allowedRoles={["Applicant"]} />}
                  >
                    <Route path="/dashboard" element={<ApplicantDashboard />} />
                    <Route path="/ip/:id" element={<IPDetail />} />
                  </Route>

                  {/* ✅ Attorney */}
                  <Route
                    element={<ProtectedRoute allowedRoles={["IPAttorney"]} />}
                  >
                    <Route
                      path="/attorney/dashboard"
                      element={<AttorneyDashboard />}
                    />
                    <Route path="/attorney/ip/:id" element={<IPDetail />} />
                  </Route>

                  {/* ✅ Admin */}
                  <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                    <Route
                      path="/admin/dashboard"
                      element={<AdminDashboard />}
                    />
                    <Route
                      path="/admin/create-ip"
                      element={<AdminCreateIP />}
                    />
                    <Route path="/admin/users" element={<AdminViewUsers />} />
                    <Route path="/admin/ips" element={<AdminViewIPs />} />
                    <Route
                      path="/admin/authorize-attorney"
                      element={<AdminAuthorizeAttorney />}
                    />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
