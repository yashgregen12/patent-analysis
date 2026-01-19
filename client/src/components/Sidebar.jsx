import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  UserPlus,
  FilePlus,
  Home,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Common navigation items
  const commonNav = [
    { label: "Public IPs", icon: Home, path: "/ips", roles: ["all"] },
  ];

  // Role-specific navigation
  const roleNav = {
    Applicant: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      // { label: "New Application", icon: FilePlus, path: "/create-ip" }, // Temporarily removed as per recent file deletions, add back if route exists
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
      { label: "Manage IPs", icon: FileText, path: "/admin/ips" },
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

  const toggleSidebar = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-6 border-b flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl">PatentSys</span>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}>
            <Button
              variant={location.pathname === item.path ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                location.pathname === item.path && "bg-secondary"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t mt-auto">
        {user ? (
          <>
            <div className="mb-4 px-2">
              <p className="font-medium text-sm truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </>
        ) : (
          <Link to="/login" onClick={() => setIsOpen(false)}>
            <Button variant="default" className="w-full justify-start gap-3">
              <LogOut className="h-5 w-5 rotate-180" />{" "}
              {/* Using LogOut rotated or could import LogIn */}
              Login
            </Button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <div className="lg:hidden p-4 border-b bg-background flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-bold">PatentSys</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
