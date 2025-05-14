import { BellIcon } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get current user data
  const { data: user } = useQuery<User>({ 
    queryKey: ['/api/auth/status'],
    refetchOnWindowFocus: false,
  });
  
  // Get user initials for the avatar
  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : "US";
  
  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          {/* Mobile Menu Button */}
          <button 
            type="button" 
            className="md:hidden text-secondary-500 mr-3"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          </button>
          
          <div className="text-lg font-medium text-secondary-500">
            {title}
          </div>
        </div>
        
        <div className="flex items-center">
          <button 
            type="button" 
            className="p-2 rounded-full text-gray-500 hover:text-secondary-500 hover:bg-gray-100 focus:outline-none"
          >
            <BellIcon className="h-6 w-6" />
          </button>
          
          <button 
            type="button" 
            className="ml-3 flex items-center text-sm focus:outline-none"
          >
            <span className="mr-2 hidden md:block">{user?.fullName}</span>
            <div className="w-8 h-8 rounded-full bg-secondary-500 flex items-center justify-center text-white">
              <span>{userInitials}</span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg absolute z-10 w-full">
          <nav className="px-4 py-2">
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    Dashboard
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/processes">
                  <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    Processos
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/bidding-flow">
                  <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    Fluxo de Licitação
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/reports">
                  <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    Relatórios
                  </a>
                </Link>
              </li>
              {user?.role === 'admin' && (
                <li>
                  <Link href="/users">
                    <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                      Usuários
                    </a>
                  </Link>
                </li>
              )}
              <li>
                <Link href="/settings">
                  <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    Configurações
                  </a>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
