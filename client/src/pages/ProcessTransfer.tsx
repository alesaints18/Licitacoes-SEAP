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
  const availableDepartments = departments?.filter(d => d.id !== process.currentDepartmentId) || [];

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
              Transferir para <span className="text-red-500">*</span>
            </label>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o departamento de destino" />
              </SelectTrigger>
              <SelectContent>
                {availableDepartments.map((department) => (
                  <SelectItem key={department.id} value={department.id.toString()}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button
              onClick={handleTransfer}
              disabled={!selectedDepartmentId || transferMutation.isPending}
              className="flex-1"
            >
              {transferMutation.isPending ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessTransfer;