import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ProcessTransferProps {
  id: string;
}

const ProcessTransfer = ({ id }: ProcessTransferProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const parsedId = parseInt(id);

  // Get process details
  const { data: process, isLoading: processLoading } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
  });

  // Get departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (departmentId: number) => {
      const response = await apiRequest("POST", `/api/processes/${parsedId}/transfer`, {
        departmentId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Processo transferido",
        description: "O processo foi transferido com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${parsedId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
      setLocation(`/processes/${parsedId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na transferência",
        description: error.message || "Não foi possível transferir o processo",
        variant: "destructive"
      });
    }
  });

  const handleTransfer = () => {
    if (!selectedDepartmentId) {
      toast({
        title: "Departamento necessário",
        description: "Selecione um departamento para transferir o processo",
        variant: "destructive"
      });
      return;
    }

    transferMutation.mutate(parseInt(selectedDepartmentId));
  };

  if (processLoading) {
    return <div className="p-8 text-center">Carregando processo...</div>;
  }

  if (!process) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Processo não encontrado</h2>
        <Button onClick={() => setLocation("/processes")}>
          Voltar para Processos
        </Button>
      </div>
    );
  }

  const currentDepartment = departments?.find(d => d.id === process.currentDepartmentId);
  
  // Definir a ordem do fluxo dos departamentos
  const departmentFlow = [
    1, // Setor de Solicitação
    2, // Divisão de Licitação
    3, // Coordenação de Licitação
    4, // Direção de Administração
    5, // Gabinete do Secretário
    6  // Arquivo/Finalização
  ];
  
  // Encontrar o índice do departamento atual no fluxo
  const currentIndex = departmentFlow.findIndex(id => id === process.currentDepartmentId);
  
  // Determinar os departamentos disponíveis (apenas o próximo no fluxo)
  const availableDepartments = [];
  if (currentIndex !== -1 && currentIndex < departmentFlow.length - 1) {
    const nextDepartmentId = departmentFlow[currentIndex + 1];
    const nextDepartment = departments?.find(d => d.id === nextDepartmentId);
    if (nextDepartment) {
      availableDepartments.push(nextDepartment);
    }
  }
  
  // Se não há departamento seguinte, o processo pode estar concluído
  const isLastDepartment = currentIndex === departmentFlow.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRight className="h-5 w-5 mr-2" />
            Transferir Processo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Processo: {process.pbdocNumber}</h3>
            <p className="text-gray-600">{process.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Departamento Atual</label>
            <div className="p-3 bg-gray-50 rounded-lg border">
              {currentDepartment?.name || "Departamento não identificado"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Próximo Departamento no Fluxo <span className="text-red-500">*</span>
            </label>
            {isLastDepartment ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  ✓ Este processo está no último departamento do fluxo
                </p>
                <p className="text-green-600 text-sm mt-1">
                  O processo pode ser finalizado ou arquivado
                </p>
              </div>
            ) : availableDepartments.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">
                  ⚠ Próximo departamento não encontrado
                </p>
                <p className="text-yellow-600 text-sm mt-1">
                  Verifique se todos os departamentos estão configurados no sistema
                </p>
              </div>
            ) : (
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Confirme o próximo departamento" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setLocation(`/processes/${parsedId}`)}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            {!isLastDepartment && availableDepartments.length > 0 && (
              <Button
                onClick={handleTransfer}
                disabled={!selectedDepartmentId || transferMutation.isPending}
                className="flex-1"
              >
                {transferMutation.isPending ? "Transferindo..." : "Confirmar Transferência"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessTransfer;