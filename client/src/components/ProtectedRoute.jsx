import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { Loading } from "./Loading";

/**
 * ProtectedRoute Component
 * Handles route protection based on authentication and role-based access control
 *
 * @param {Array<string>} allowedRoles - Array of roles allowed to access this route
 * @param {string} redirectTo - Custom redirect path (optional)
 */
const ProtectedRoute = ({ allowedRoles = [], redirectTo = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Loading />
    );
  }

  // Handle "guest only" routes FIRST (e.g., login page)
  // This MUST come before the authentication check to prevent infinite loops
  if (allowedRoles.includes("guest")) {
    // If user is authenticated, redirect them to their dashboard
    if (user) {
      return <Navigate to={getRoleDashboard(user.role)} replace />;
    }
    // If not authenticated, allow access to guest route (like login page)
    return <Outlet />;
  }

  // Redirect to login if not authenticated (for protected routes)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user's role
    const dashboard = redirectTo || getRoleDashboard(user.role);
    return <Navigate to={dashboard} replace />;
  }

  // Additional check for IP Attorney authorization
  if (user.role === "IPAttorney" && !user.isAuthorizedAttorney) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Authorization Required</h2>
          <p className="text-muted-foreground">
            Your account needs to be authorized by an administrator to access IP
            Attorney features.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized
  return <Outlet />;
};

/**
 * Helper function to get dashboard route based on user role
 */
const getRoleDashboard = (role) => {
  const dashboards = {
    Applicant: "/dashboard",
    IPAttorney: "/attorney/dashboard",
    Admin: "/admin/dashboard",
    User: "/ips", // Regular users can view public IPs
  };
  return dashboards[role] || "/ips";
};

export default ProtectedRoute;
