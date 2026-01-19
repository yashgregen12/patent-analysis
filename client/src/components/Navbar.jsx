import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  UserPlus,
  FilePlus,
  Home,
} from "lucide-react";
import { authAPI } from "@/lib/api";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Common navigation items
  const commonNav = [
    { label: "Public IPs", icon: Home, path: "/ips", roles: ["all"] },
  ];

  // Role-specific navigation
  const roleNav = {
    Applicant: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "New Application", icon: FilePlus, path: "/create-ip" },
    ],
    IPAttorney: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/attorney/dashboard",
      },
      {
        label: "Create Applicant",
        icon: UserPlus,
        path: "/attorney/create-applicant",
      },
    ],
    Admin: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
      { label: "View Users", icon: Users, path: "/admin/users" },
      { label: "Create IP", icon: FilePlus, path: "/admin/create-ip" },
      {
        label: "Authorize Attorney",
        icon: UserPlus,
        path: "/admin/authorize-attorney",
      },
    ],
  };

  const navItems = user
    ? [...commonNav, ...(roleNav[user.role] || [])]
    : commonNav;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="font-bold text-lg">Patent System</span>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}

            {/* User Info & Logout */}
            {user ? (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                <div className="text-sm">
                  <p className="font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
