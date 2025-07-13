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
import ProcessTransfer from "@/pages/ProcessTransfer";

import ProcessReport from "@/pages/ProcessReport";
import BiddingFlow from "@/pages/BiddingFlow";
import BiddingFlowchart from "@/pages/BiddingFlowchart";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import Download from "@/pages/Download";
import TermsOfUse from "@/pages/TermsOfUse";
import Convenios from "@/pages/Convenios";
import FRP from "@/pages/FRP";
import ReportExport from "@/pages/ReportExport";
import Trash from "@/pages/Trash";
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminProtectedRoute from "@/lib/admin-protected-route";
import { NotificationProvider } from "@/hooks/use-notifications";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  // Verificar se é uma rota pública
  const isDownloadPage = location.startsWith("/download/");
  const isTermsPage = location === "/termos";
  
  // Lista de rotas públicas que não precisam de autenticação
  const publicRoutes = [
    "/login",
    "/download/seappb2025",
    "/termos"
  ];

  // Verificar status da autenticação e atualizar dados quando o usuário retorna à aba
  useEffect(() => {
    let visibilityChangeHandler: () => void;
    
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

    // Configurar o manipulador de mudança de visibilidade
    visibilityChangeHandler = () => {
      // Quando o usuário retorna à aba, verificar autenticação e atualizar os dados
      if (!document.hidden) {
        console.log("Aba tornou-se visível, atualizando dados");
        
        // Verificar autenticação
        checkAuthStatus();
        
        // Invalidar cache de consultas para forçar atualização dos dados
        if (isAuthenticated) {
          // Verificar a localização atual para invalidar as consultas relevantes
          if (location === "/") {
            // Invalidar consultas da página inicial/dashboard
            import("./lib/queryClient").then(({ queryClient }) => {
              queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
              queryClient.invalidateQueries({ queryKey: ["/api/analytics/process-statistics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/analytics/processes-by-source"] });
              queryClient.invalidateQueries({ queryKey: ["/api/analytics/processes-by-responsible"] });
              queryClient.invalidateQueries({ queryKey: ["/api/settings/monthly-goal"] });
              console.log("Dados do dashboard atualizados");
            });
          } else if (location.includes("/processes")) {
            // Invalidar consultas relacionadas a processos
            import("./lib/queryClient").then(({ queryClient }) => {
              queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
              console.log("Dados de processos atualizados");
            });
          } else if (location === "/users") {
            // Invalidar consultas relacionadas a usuários
            import("./lib/queryClient").then(({ queryClient }) => {
              queryClient.invalidateQueries({ queryKey: ["/api/users"] });
              console.log("Dados de usuários atualizados");
            });
          }
        }
      }
    };

    // Iniciar verificação de autenticação
    checkAuthStatus();
    
    // Adicionar event listener para mudança de visibilidade
    document.addEventListener("visibilitychange", visibilityChangeHandler);
    
    // Limpar event listener ao desmontar
    return () => {
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    };
  }, [location, setLocation, toast, isAuthenticated]);

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  // Construir o componente de roteamento direto para rotas públicas
  if (isDownloadPage || isTermsPage) {
    return (
      <Switch>
        <Route path="/download/:token">
          {(params) => {
            const validToken = "seappb2025";
            if (params.token === validToken) {
              return <Download />;
            } else {
              return <NotFound />;
            }
          }}
        </Route>
        <Route path="/termos" component={TermsOfUse} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  // Para outras rotas, verificar autenticação
  if (!isAuthenticated && location !== "/login") {
    console.log("Not authenticated and not on login page, redirecting to login");
    setTimeout(() => {
      setLocation("/login");
    }, 0);
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Página de download protegida por token, acessível apenas por link direto */}
      <Route path="/download/:token">
        {(params) => {
          // Token de acesso fixo para validação - na prática pode vir do banco de dados
          const validToken = "seappb2025";
          if (params.token === validToken) {
            return <Download />;
          } else {
            return <NotFound />;
          }
        }}
      </Route>
      
      {/* Página de termos de uso */}
      <Route path="/termos" component={TermsOfUse} />
      
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
      
      <Route path="/processes/:id/transfer">
        {params => (
          <Layout>
            <ProcessTransfer id={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/processes/:id/report">
        {params => (
          <Layout>
            <ProcessReport id={params.id} />
          </Layout>
        )}
      </Route>
      
      <Route path="/bidding-flow">
        <Layout>
          <BiddingFlow />
        </Layout>
      </Route>
      
      <Route path="/flowchart">
        <Layout>
          <BiddingFlowchart />
        </Layout>
      </Route>
      
      <Route path="/reports">
        <Layout>
          <AdminProtectedRoute>
            <Reports />
          </AdminProtectedRoute>
        </Layout>
      </Route>
      
      <Route path="/trash">
        <Layout>
          <Trash />
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
      
      <Route path="/conv">
        <Layout>
          <AdminProtectedRoute>
            <Convenios />
          </AdminProtectedRoute>
        </Layout>
      </Route>
      
      <Route path="/frp">
        <Layout>
          <AdminProtectedRoute>
            <FRP />
          </AdminProtectedRoute>
        </Layout>
      </Route>
      
      <Route path="/relatorio">
        <Layout>
          <ReportExport />
        </Layout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente para forçar carregamento correto de imagens
function ImagePreloader() {
  useEffect(() => {
    // Funções para pré-carregar imagens críticas
    const preloadImages = () => {
      // Lista de imagens que precisam ser pré-carregadas
      const imagesToPreload = [
        "https://paraiba.pb.gov.br/marca-do-governo/GovPBT.png"
      ];
      
      // Pré-carregar cada imagem
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
        
        // Garantir que a imagem seja armazenada em cache
        img.onload = () => console.log(`Imagem pré-carregada: ${src}`);
        img.onerror = () => console.error(`Erro ao carregar imagem: ${src}`);
      });
    };
    
    // Carregar imagens quando o componente for montado
    preloadImages();
    
    // Recarregar imagens quando a página estiver totalmente carregada
    window.addEventListener('load', preloadImages);
    
    return () => {
      window.removeEventListener('load', preloadImages);
    };
  }, []);
  
  return null;
}

// Componente principal da aplicação
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <ImagePreloader />
          <Router />
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
