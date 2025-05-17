import { useLocation, Link } from "wouter";
import {
  Home,
  FileText,
  GitMerge,
  BarChart2,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { ThemeToggle } from "./theme-toggle";

const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível encerrar a sessão",
        variant: "destructive",
      });
    }
  };

  const navItems = useMemo(
    () => [
      {
        path: "/",
        icon: <Home className="h-5 w-5 mr-3" />,
        label: "Dashboard",
      },
      {
        path: "/processes",
        icon: <FileText className="h-5 w-5 mr-3" />,
        label: "Processos",
      },
      {
        path: "/bidding-flow",
        icon: <GitMerge className="h-5 w-5 mr-3" />,
        label: "Fluxo de Licitação",
      },
      {
        path: "/reports",
        icon: <BarChart2 className="h-5 w-5 mr-3" />,
        label: "Relatórios",
      },
      {
        path: "/users",
        icon: <Users className="h-5 w-5 mr-3" />,
        label: "Usuários",
        adminOnly: true,
      },
      {
        path: "/settings",
        icon: <Settings className="h-5 w-5 mr-3" />,
        label: "Configurações",
      },
    ],
    [],
  );

  // Filter out admin-only items if user is not admin
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  // Get user initials for the avatar
  const userInitials = useMemo(() => {
    if (!user?.fullName) return "US";
    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.fullName]);

  return (
    <aside className="flex flex-shrink-0">
      <div className="flex flex-col w-64 dark:bg-[#010021] bg-[#4682B4] shadow-lg">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center h-auto px-30 dark:bg-[#01001A] bg-[#396a9c]">
          <img
            src="https://paraiba.pb.gov.br/marca-do-governo/GovPBT.png"
            alt="Logo"
            className=" w-100 mr-2"
            width={150}
          />
          <div className="flex items-center">
            <span className=" text-white font-medium text-lg">SEAP-PB</span>
          </div>
        </div>

        {/* User Info */}
        <div className="flex flex-col items-center py-4 border-b dark:border-[#090935] border-[#5892c2]">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-2">
            <span className="dark:text-[#010021] text-[#4682B4] font-bold text-lg">
              {userInitials}
            </span>
          </div>
          <div className="text-white text-sm font-medium">{user?.fullName}</div>
          <div className="dark:text-blue-200 text-blue-100 text-xs capitalize">{user?.role}</div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => (
              <li key={item.path} className="px-2">
                <Link
                  href={item.path}
                  className={`flex items-center px-4 py-3 rounded-md group transition-colors ${
                    location === item.path
                      ? "text-white dark:bg-[#01001A] bg-[#396a9c] font-medium"
                      : "text-white dark:hover:bg-[#020035] hover:bg-[#5892c2]"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Version and Theme */}
        <div className="p-2 border-t dark:border-[#090935] border-[#5892c2]">
          <div className="flex items-center justify-between px-4 py-2 text-white text-xs">
            <span>v1.0.0</span>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
        </div>
        
        {/* Logout Link */}
        <div className="p-2 border-t dark:border-[#090935] border-[#5892c2]">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-white dark:hover:bg-[#01001A] hover:bg-[#396a9c] rounded-md group transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
