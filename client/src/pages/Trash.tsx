import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, RotateCcw, AlertTriangle, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Process } from "@shared/schema";

const Trash = () => {
  const { toast } = useToast();

  // Buscar processos excluídos com refresh automático
  const { data: deletedProcesses = [], isLoading } = useQuery<Process[]>({
    queryKey: ["/api/processes/deleted"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/processes/deleted");
      return response.json();
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos
    refetchIntervalInBackground: true, // Continua atualizando mesmo quando a aba não está ativa
  });

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Conexão WebSocket estabelecida para lixeira");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Mensagem WebSocket recebida na lixeira:", data);

      if (data.type === "process_deleted" || data.type === "process_restored") {
        // Invalidar cache para recarregar a lista de processos excluídos
        queryClient.invalidateQueries({ queryKey: ["/api/processes/deleted"] });
      }
    };

    socket.onclose = () => {
      console.log("Conexão WebSocket fechada na lixeira");
    };

    socket.onerror = (error) => {
      console.error("Erro WebSocket na lixeira:", error);
    };

    return () => {
      socket.close();
    };
  }, []);

  // Mutation para restaurar processo
  const restoreMutation = useMutation({
    mutationFn: async (processId: number) => {
      const response = await apiRequest("POST", `/api/processes/${processId}/restore`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes/deleted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({
        title: "Processo restaurado",
        description: "O processo foi restaurado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível restaurar o processo",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir permanentemente
  const permanentDeleteMutation = useMutation({
    mutationFn: async (processId: number) => {
      const response = await apiRequest("DELETE", `/api/processes/${processId}/permanent`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes/deleted"] });
      toast({
        title: "Processo excluído permanentemente",
        description: "O processo foi excluído definitivamente do sistema",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o processo permanentemente",
        variant: "destructive",
      });
    },
  });

  const handleRestore = (processId: number) => {
    if (confirm("Tem certeza que deseja restaurar este processo?")) {
      restoreMutation.mutate(processId);
    }
  };

  const handlePermanentDelete = (processId: number) => {
    if (confirm("ATENÇÃO: Esta ação é irreversível! Tem certeza que deseja excluir permanentemente este processo?")) {
      permanentDeleteMutation.mutate(processId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      case "overdue":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluído";
      case "in_progress":
        return "Em Andamento";
      case "canceled":
        return "Cancelado";
      case "overdue":
        return "Atrasado";
      case "draft":
        return "Rascunho";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando processos excluídos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trash2 className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold">Lixeira Eletrônica</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie processos que foram excluídos do sistema
        </p>
      </div>

      {deletedProcesses.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Lixeira vazia</h3>
              <p className="text-muted-foreground">
                Não há processos excluídos no momento
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Os processos nesta lixeira podem ser restaurados ou excluídos permanentemente.
              <strong> A exclusão permanente é irreversível.</strong>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {deletedProcesses.map((process) => (
              <Card key={process.id} className="border-red-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {process.pbdocNumber}
                        <Badge className={getStatusColor(process.status)}>
                          {getStatusLabel(process.status)}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {process.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(process.id)}
                        disabled={restoreMutation.isPending}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePermanentDelete(process.id)}
                        disabled={permanentDeleteMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Definitivamente
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Excluído em:</span>
                        <p>{process.deletedAt ? new Date(process.deletedAt).toLocaleDateString('pt-BR') : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Excluído por:</span>
                        <p>Usuário ID: {process.deletedBy || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Criado em:</span>
                      <p>{new Date(process.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Última atualização:</span>
                      <p>{new Date(process.updatedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  {process.returnComments && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <span className="font-medium">Últimos comentários:</span>
                      <p className="text-sm mt-1">{process.returnComments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Trash;