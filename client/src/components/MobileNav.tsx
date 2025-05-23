import { useLocation, Link } from "wouter";
import { Home, FileText, BarChart2, Menu } from "lucide-react";

const MobileNav = () => {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-[#105e8f] dark:bg-[#010021] shadow-lg">
      <div className="flex justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center py-3 text-white ${location === "/" ? "bg-[#396a9c] dark:bg-[#01001A] px-4 rounded-t-lg" : ""}`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>

        <Link
          href="/processes"
          className={`flex flex-col items-center py-3 text-white ${location.startsWith("/processes") ? "bg-[#396a9c] dark:bg-[#01001A] px-4 rounded-t-lg" : ""}`}
        >
          <FileText className="h-6 w-6" />
          <span className="text-xs mt-1">Processos</span>
        </Link>

        <Link
          href="/reports"
          className={`flex flex-col items-center py-3 text-white ${location === "/reports" ? "bg-[#396a9c] dark:bg-[#01001A] px-4 rounded-t-lg" : ""}`}
        >
          <BarChart2 className="h-6 w-6" />
          <span className="text-xs mt-1">Relatórios</span>
        </Link>

        {/*    <button className="flex flex-col items-center py-3 text-white">
          <Menu className="h-6 w-6" />
          <span className="text-xs mt-1">Menu</span>
        </button> */}
      </div>
    </div>
  );
};

export default MobileNav;
