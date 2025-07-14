import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, User, FileText, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface RejectedStep {
  id: number;
  processId: number;
  stepName: string;
  observations: string;
  rejectedAt: string;
  rejectionStatus: string;
  process: {
    pbdocNumber: string;
    description: string;
  };
  department: {
    name: string;
  };
  completedBy: {
    username: string;
  };
}

const RejectedSteps = () => {
  // Refresh automático ao entrar na página
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/steps/rejected"] });
  }, []);

  const { data: rejectedSteps = [], isLoading } = useQuery<RejectedStep[]>({
    queryKey: ["/api/steps/rejected"],
    queryFn: async () => {
      const response = await fetch("/api/steps/rejected");
      if (!response.ok) {
        throw new Error("Erro ao buscar etapas rejeitadas");
      }
      return response.json();
    },
  });

  const columns: ColumnDef<RejectedStep>[] = [
    {
      accessorKey: "process.pbdocNumber",
      header: "PBDOC",
      cell: ({ row }) => (
        <Link href={`/processes/${row.original.processId}`}>
          <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-800">
            {row.original.process.pbdocNumber}
          </Button>
        </Link>
      ),
    },
    {
      accessorKey: "stepName",
      header: "Etapa",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium text-sm">{row.original.stepName}</p>
          <p className="text-xs text-gray-500 truncate">{row.original.process.description}</p>
        </div>
      ),
    },
    {
      accessorKey: "department.name",
      header: "Departamento",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.department.name}
        </Badge>
      ),
    },
    {
      accessorKey: "completedBy.username",
      header: "Rejeitado por",
      cell: ({ row }) => (
        <div className="flex items-center">
          <User className="h-4 w-4 mr-1 text-gray-500" />
          <span className="text-sm">{row.original.completedBy?.username || "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "rejectedAt",
      header: "Data da Rejeição",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1 text-gray-500" />
          <span className="text-sm">
            {format(new Date(row.original.rejectedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "observations",
      header: "Motivo da Rejeição",
      cell: ({ row }) => {
        const observations = row.original.observations || "";
        const cleanObservations = observations.replace(/^\[REJEITADO\]\s*/, "");
        
        return (
          <div className="max-w-md">
            <p className="text-sm text-gray-700 line-clamp-3">{cleanObservations}</p>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Link href={`/processes/${row.original.processId}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              Ver Processo
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando etapas rejeitadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="h-8 w-8 mr-3 text-orange-600" />
              Etapas Rejeitadas
            </h1>
            <p className="text-gray-600 mt-2">
              Visualize e gerencie todas as etapas que foram rejeitadas mas aprovadas para continuidade do fluxo
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Rejeições</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedSteps.length}</div>
            <p className="text-xs text-gray-500">
              Etapas rejeitadas com aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeições Recentes</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rejectedSteps.filter(step => {
                const rejectedDate = new Date(step.rejectedAt);
                const today = new Date();
                const diffTime = today.getTime() - rejectedDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
              }).length}
            </div>
            <p className="text-xs text-gray-500">
              Últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Afetados</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(rejectedSteps.map(step => step.processId)).size}
            </div>
            <p className="text-xs text-gray-500">
              Processos únicos com rejeições
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Etapas Rejeitadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Etapas Rejeitadas com Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rejectedSteps.length === 0 ? (
            <div className="text-center py-12">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma etapa rejeitada
              </h3>
              <p className="text-gray-500">
                Todas as etapas foram aprovadas normalmente.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rejectedSteps}
              searchKey="stepName"
              searchPlaceholder="Buscar por etapa..."
            />
          )}
        </CardContent>
      </Card>

      {/* Informações sobre o sistema */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
            Como funciona o sistema de rejeições
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-orange-600">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Rejeição com Aprovação</h4>
                <p className="text-gray-600 text-sm">
                  Quando uma etapa é rejeitada, ela é marcada como concluída para permitir a continuidade do fluxo, 
                  mas é registrada como rejeitada para revisão administrativa.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Continuidade do Processo</h4>
                <p className="text-gray-600 text-sm">
                  O processo continua normalmente através dos departamentos, não sendo interrompido pela rejeição.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-green-600">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Revisão Administrativa</h4>
                <p className="text-gray-600 text-sm">
                  Os administradores podem revisar todas as rejeições nesta página e tomar as ações necessárias.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RejectedSteps;