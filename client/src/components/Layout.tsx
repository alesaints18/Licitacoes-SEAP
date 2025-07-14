import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import { useLocation } from "wouter";
import { DeadlineAlert } from "./alerts/DeadlineAlert";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [location] = useLocation();
  
  // Get the current page title based on the route
  const getPageTitle = () => {
    const path = location.split("/")[1];
    
    switch (path) {
      case "":
        return "Dashboard";
      case "processes":
        if (location.includes("new")) return "Novo Processo";
        if (location.split("/").length > 2) return "Detalhes do Processo";
        return "Processos";
      case "bidding-flow":
        return "Fluxo de Licitação";
      case "reports":
        return "Relatórios";
      case "users":
        return "Usuários";
      case "settings":
        return "Configurações";
      case "rejected-steps":
        return "Etapas Rejeitadas";
      default:
        return "Sistema de Controle de Processos de Licitação";
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden" id="app-container">
      {/* Componente para verificar prazos e mostrar alertas */}
      <DeadlineAlert />
      
      {/* Sidebar - hidden on mobile */}
      <Sidebar />
      
      {/* Mobile Navigation - shown only on smaller screens */}
      <MobileNav />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Header title={getPageTitle()} />
        
        {/* Page Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
