import { useLocation, Link } from "wouter";
import { Home, FileText, BarChart2, Menu } from "lucide-react";

const MobileNav = () => {
  const [location] = useLocation();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-secondary-500 shadow-lg">
      <div className="flex justify-around">
        <Link href="/" className="flex flex-col items-center py-2 text-white">
          <Home className="h-6 w-6" />
          <span className="text-xs">Dashboard</span>
        </Link>
        
        <Link href="/processes" className="flex flex-col items-center py-2 text-white">
          <FileText className="h-6 w-6" />
          <span className="text-xs">Processos</span>
        </Link>
        
        <Link href="/reports" className="flex flex-col items-center py-2 text-white">
          <BarChart2 className="h-6 w-6" />
          <span className="text-xs">Relatórios</span>
        </Link>
        
        <button className="flex flex-col items-center py-2 text-white">
          <Menu className="h-6 w-6" />
          <span className="text-xs">Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;
