import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, Department, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

interface ProcessReturnProps {
  id: string;
}

const ProcessReturn = ({ id }: ProcessReturnProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [returnComment, setReturnComment] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const parsedId = parseInt(id);

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/status');
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    }
  });

  // Get process details
  const { data: process, isLoading: processLoading } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/processes/${parsedId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch process');
      }
      return response.json();
    }
  });

  // Get departments
  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/departments');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return response.json();
    }
  });
  
  console.log('Departments query:', {
    departments,
    loading: departmentsLoading,
    error: departmentsError
  });

  const isAdmin = currentUser?.role === 'admin';
  
  console.log('ProcessReturn Debug:', {
    currentUser,
    isAdmin,
    userRole: currentUser?.role,
    departments: departments?.length
  });

  // Return mutation
  const returnMutation = useMutation({
    mutationFn: async (data: { comment: string; targetDepartmentId?: number }) => {
      const response = await apiRequest("POST", `/api/processes/${parsedId}/return`, {
        returnComment: data.comment,
        targetDepartmentId: data.targetDepartmentId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Processo retornado",
        description: "O processo foi retornado com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${parsedId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
      setLocation(`/processes/${parsedId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no retorno",
        description: error.message || "Não foi possível retornar o processo",
        variant: "destructive"
      });
    }
  });

  const handleReturn = () => {
    if (!returnComment.trim()) {
      toast({
        title: "Comentário necessário",
        description: "Digite um comentário explicando o motivo do retorno",
        variant: "destructive"
      });
      return;
    }

    // Se for admin e selecionou um departamento, incluir no retorno
    const targetDepartmentId = isAdmin && selectedDepartment ? 
      parseInt(selectedDepartment) : undefined;

    returnMutation.mutate({
      comment: returnComment.trim(),
      targetDepartmentId
    });
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

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retornar Processo
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

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Departamento de Destino
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar departamento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Seguir fluxo normal (departamento anterior)</SelectItem>
                  {departments?.map((dept) => {
                    console.log('Renderizando departamento:', dept);
                    return (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Como administrador, você pode retornar o processo para qualquer departamento
              </p>
              <div className="text-xs text-gray-400 mt-2">
                Debug: {departments?.length || 0} departamentos carregados
                <br />
                Loading: {departmentsLoading ? 'Sim' : 'Não'}
                <br />
                Error: {departmentsError ? 'Sim' : 'Não'}
                <br />
                IsAdmin: {isAdmin ? 'Sim' : 'Não'}
              </div>
              
              {/* Forçar exibição dos departamentos para debug */}
              {departments && departments.length > 0 && (
                <div className="text-xs text-gray-400 mt-2 border p-2 rounded bg-gray-50">
                  <strong>Departamentos encontrados:</strong>
                  {departments.map(dept => (
                    <div key={dept.id}>• {dept.name} (ID: {dept.id})</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Motivo do Retorno <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Digite o motivo pelo qual o processo está sendo retornado..."
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              rows={4}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              Explique claramente o motivo do retorno para facilitar a correção
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Atenção</h4>
            <p className="text-sm text-yellow-700">
              {isAdmin && selectedDepartment ? (
                `O processo será retornado para ${departments?.find(d => d.id.toString() === selectedDepartment)?.name || 'o departamento selecionado'}.`
              ) : (
                'O processo será retornado para o departamento anterior no fluxo.'
              )}
              {' '}Certifique-se de que o comentário seja claro e específico sobre as correções necessárias.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setLocation(`/processes/${parsedId}`)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReturn}
              disabled={!returnComment.trim() || returnMutation.isPending}
              variant="destructive"
              className="flex-1"
            >
              {returnMutation.isPending ? "Retornando..." : "Confirmar Retorno"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessReturn;