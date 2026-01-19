import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

const Header = ({ title, role }) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    // Clear cookies/storage logic here
    // For now just redirect
    navigate("/login");
  };

  return (
    <header className="border-b">
      <div className="flex items-center justify-between h-16 px-4 container mx-auto">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {role && (
            <span className="text-xs px-2 py-1 bg-muted rounded-full uppercase">
              {role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
