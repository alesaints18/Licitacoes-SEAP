import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/status');
      if (!response.ok) {
        throw new Error('Não autenticado');
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (!isLoading && !error) {
      if (!user) {
        setLocation('/login');
        toast({
          title: "Acesso negado",
          description: "Você precisa estar autenticado para acessar esta página",
          variant: "destructive",
        });
      } else if (user.role !== 'admin') {
        setLocation('/');
        toast({
          title: "Acesso restrito",
          description: "Esta área é restrita apenas para administradores",
          variant: "destructive",
        });
      }
    }
  }, [user, isLoading, error, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error) {
    setLocation('/login');
    return null;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}

export default AdminProtectedRoute;