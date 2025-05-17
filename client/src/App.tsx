import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Processes from "@/pages/Processes";
import ProcessDetail from "@/pages/ProcessDetail";
import ProcessCreate from "@/pages/ProcessCreate";
import ProcessEdit from "@/pages/ProcessEdit";
import BiddingFlow from "@/pages/BiddingFlow";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminProtectedRoute from "@/lib/admin-protected-route";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Adicionando timestamp para evitar cache
        const timestamp = Date.now();
        const res = await fetch(`/api/auth/status?_t=${timestamp}`, {
          credentials: "include",
          cache: "no-store" // Forçar sempre atualizar 
        });
        
        console.log("Resposta de verificação de autenticação:", res.status);
        
        if (res.ok) {
          const userData = await res.json();
          console.log("User is authenticated:", userData.username);
          setIsAuthenticated(true);
          
          // Se o usuário estiver na página de login e já estiver autenticado, redireciona para o dashboard
          if (location === "/login") {
            console.log("Redirecionando usuário autenticado para o dashboard");
            setLocation("/");
            // Fallback se o redirecionamento via wouter falhar
            setTimeout(() => {
              if (window.location.pathname === "/login") {
                console.log("Fallback: usando window.location para redirecionar");
                window.location.href = "/";
              }
            }, 300);
          }
        } else {
          console.log("User is not authenticated, status:", res.status);
          setIsAuthenticated(false);
          
          if (location !== "/login") {
            console.log("Redirecionando para tela de login");
            setLocation("/login");
            // Adicionar um fallback se o redirecionamento via setLocation falhar
            setTimeout(() => {
              if (window.location.pathname !== "/login") {
                console.log("Fallback: usando window.location para redirecionar para login");
                window.location.href = "/login";
              }
            }, 300);
          }
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsAuthenticated(false);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar ao servidor",
          variant: "destructive",
        });
        
        // Em caso de erro, redirecionar para login
        if (location !== "/login") {
          setTimeout(() => setLocation("/login"), 100);
        }
      }
    };

    checkAuthStatus();
  }, [location, setLocation, toast]);

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  // If not authenticated, only allow access to login page
  if (!isAuthenticated && location !== "/login") {
    console.log("Not authenticated and not on login page, redirecting to login");
    // Use setTimeout to break the synchronous flow and avoid potential infinite loops
    setTimeout(() => {
      setLocation("/login");
    }, 0);
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      
      <Route path="/processes">
        <Layout>
          <Processes />
        </Layout>
      </Route>
      
      <Route path="/processes/new">
        <Layout>
          <ProcessCreate />
        </Layout>
      </Route>
      
      <Route path="/processes/:id">
        {params => (
          <Layout>
            <ProcessDetail id={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/processes/:id/edit">
        {params => (
          <Layout>
            <ProcessEdit id={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/bidding-flow">
        <Layout>
          <BiddingFlow />
        </Layout>
      </Route>
      
      <Route path="/reports">
        <Layout>
          <AdminProtectedRoute>
            <Reports />
          </AdminProtectedRoute>
        </Layout>
      </Route>
      
      <Route path="/users">
        <Layout>
          <Users />
        </Layout>
      </Route>
      
      <Route path="/settings">
        <Layout>
          <Settings />
        </Layout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
