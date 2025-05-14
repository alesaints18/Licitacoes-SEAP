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
import BiddingFlow from "@/pages/BiddingFlow";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/auth/status", {
          credentials: "include",
        });
        
        if (res.ok) {
          setIsAuthenticated(true);
          console.log("User is authenticated");
          // If the user is on the login page and is already authenticated, redirect to dashboard
          if (location === "/login") {
            setLocation("/");
          }
        } else {
          setIsAuthenticated(false);
          console.log("User is not authenticated");
          if (location !== "/login") {
            setLocation("/login");
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
      
      <Route path="/bidding-flow">
        <Layout>
          <BiddingFlow />
        </Layout>
      </Route>
      
      <Route path="/reports">
        <Layout>
          <Reports />
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
