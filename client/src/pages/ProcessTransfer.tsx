import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

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

  // Get process steps to check completion
  const { data: steps } = useQuery({
    queryKey: [`/api/processes/${parsedId}/steps`],
  });

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
  
  // Importar função para obter etapas do setor
  const getSectorSteps = (departmentName: string, modalityId: number) => {
    // Lógica das etapas baseada no departamento e modalidade
    const stepsByDepartment: Record<string, any[]> = {
      "Setor Demandante": [
        { name: "Documento de Formalização da Demanda - DFD", phase: "Iniciação" },
        { name: "Estudo Técnico Preliminar - ETP", phase: "Iniciação" },
        { name: "Mapa de Risco - MR", phase: "Iniciação" },
        { name: "Termo de Referência - TR", phase: "Iniciação" }
      ],
      "Divisão de Licitação": [
        { name: "Encaminhamento da demanda ao setor de licitações", phase: "Preparação" },
        { name: "Designação do pregoeiro e equipe de apoio", phase: "Preparação" },
        { name: "Elaboração do edital de licitação", phase: "Preparação", nextSector: "Jurídico" },
        { name: "Publicação do aviso de licitação", phase: "Execução" },
        { name: "Disponibilização do edital aos interessados", phase: "Execução" },
        { name: "Período para envio de propostas", phase: "Execução" },
        { name: "Sessão pública do pregão eletrônico", phase: "Execução" },
        { name: "Análise e classificação das propostas", phase: "Execução" },
        { name: "Habilitação dos licitantes", phase: "Execução", nextSector: "Financeiro" }
      ]
    };
    return stepsByDepartment[departmentName] || [];
  };

  // Verificar se todas as etapas do setor atual estão concluídas
  const currentDepartment = departments?.find(d => d.id === process.currentDepartmentId);
  const currentDepartmentName = currentDepartment?.name || "";
  const expectedSteps = getSectorSteps(currentDepartmentName, process.modalityId);
  
  // Filtrar etapas baseado nos nomes esperados para o setor atual
  const currentDepartmentSteps = steps?.filter(step => 
    expectedSteps.some(expectedStep => expectedStep.name === step.stepName)
  ) || [];
  
  const incompleteSteps = currentDepartmentSteps.filter(step => !step.isCompleted);
  const allStepsCompleted = expectedSteps.length > 0 && currentDepartmentSteps.length >= expectedSteps.length && incompleteSteps.length === 0;
  
  // Debug temporário
  console.log("Transfer validation debug:", {
    currentDepartmentId: process.currentDepartmentId,
    currentDepartmentName,
    modalityId: process.modalityId,
    expectedStepsCount: expectedSteps.length,
    foundStepsCount: currentDepartmentSteps.length,
    incompleteSteps: incompleteSteps.length,
    allStepsCompleted,
    expectedSteps: expectedSteps.map(s => s.name),
    foundSteps: currentDepartmentSteps.map(s => ({ 
      name: s.stepName, 
      departmentId: s.departmentId, 
      isCompleted: s.isCompleted 
    }))
  });
  
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
            <label className="block text-sm font-medium mb-4">Fluxo de Transferência</label>
            
            {/* Visualização do fluxo de departamentos */}
            <div className="space-y-4">
              {departmentFlow.map((deptId, index) => {
                const dept = departments?.find(d => d.id === deptId);
                if (!dept) return null;
                
                const isPrevious = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isNext = index === currentIndex + 1;
                const isFuture = index > currentIndex + 1;
                
                return (
                  <div key={deptId} className="flex items-center space-x-3">
                    {/* Botão do departamento */}
                    <div
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        isPrevious 
                          ? "bg-green-50 border-green-200 text-green-800"
                          : isCurrent 
                            ? "bg-blue-50 border-blue-400 text-blue-800"
                            : isNext 
                              ? "bg-orange-50 border-orange-300 text-orange-800 border-dashed"
                              : "bg-gray-50 border-gray-200 text-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{dept.name}</h4>
                          <p className="text-sm opacity-75">
                            {isPrevious && "Concluído"}
                            {isCurrent && "Atual"}
                            {isNext && "Próximo"}
                            {isFuture && "Aguardando"}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {isPrevious && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {isCurrent && <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />}
                          {isNext && <ArrowRight className="h-5 w-5 text-orange-600" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Área de confirmação */}
            <div className="mt-6 space-y-4">
              {/* Status das etapas do setor atual */}
              {currentDepartmentSteps.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                  allStepsCompleted 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-start space-x-3">
                    {allStepsCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <div className="h-5 w-5 bg-red-500 rounded-full mt-0.5 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        allStepsCompleted ? "text-green-800" : "text-red-800"
                      }`}>
                        {allStepsCompleted 
                          ? "Todas as etapas do setor foram concluídas" 
                          : "Etapas pendentes no setor atual"
                        }
                      </p>
                      {!allStepsCompleted && (
                        <div className="mt-2">
                          <p className="text-red-600 text-sm mb-2">
                            É necessário concluir todas as etapas antes de transferir:
                          </p>
                          <ul className="text-sm text-red-700 space-y-1">
                            {incompleteSteps.map((step, index) => (
                              <li key={index} className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                <span>{step.stepName}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmação da transferência */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                {isLastDepartment ? (
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">
                      Este processo está no último departamento do fluxo
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      O processo pode ser finalizado ou arquivado
                    </p>
                  </div>
                ) : availableDepartments.length === 0 ? (
                  <div className="text-center">
                    <p className="text-yellow-800 font-medium">
                      Próximo departamento não encontrado
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      Verifique se todos os departamentos estão configurados
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      {allStepsCompleted 
                        ? "Confirme a transferência para o próximo departamento:" 
                        : "Complete todas as etapas antes de transferir:"
                      }
                    </p>
                    <button
                      onClick={() => setSelectedDepartmentId(availableDepartments[0].id.toString())}
                      disabled={!allStepsCompleted}
                      className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                        !allStepsCompleted
                          ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                          : selectedDepartmentId 
                            ? "bg-blue-500 border-blue-500 text-white" 
                            : "bg-white border-orange-300 text-orange-800 hover:bg-orange-50"
                      }`}
                    >
                      {!allStepsCompleted
                        ? "Transferência bloqueada"
                        : selectedDepartmentId 
                          ? "✓ Confirmado" 
                          : `Transferir para ${availableDepartments[0].name}`
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
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
                disabled={!selectedDepartmentId || transferMutation.isPending || !allStepsCompleted}
                className="flex-1"
              >
                {transferMutation.isPending 
                  ? "Transferindo..." 
                  : !allStepsCompleted 
                    ? "Complete todas as etapas primeiro"
                    : "Confirmar Transferência"
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessTransfer;