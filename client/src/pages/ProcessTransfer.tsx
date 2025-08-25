import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

interface ProcessTransferProps {
  id: string;
}

const ProcessTransfer = ({ id }: ProcessTransferProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [showReturnPanel, setShowReturnPanel] = useState(false);
  const [allowAllPreviousDepartments, setAllowAllPreviousDepartments] = useState(false);
  const [selectedReturnDepartment, setSelectedReturnDepartment] = useState<string>("");
  const parsedId = parseInt(id);

  // Get process details
  const { data: process, isLoading: processLoading } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
  });

  // Get departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  // Get current user
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/status'],
  });

  const isAdmin = currentUser?.role === 'admin';

  // Get process steps
  const { data: steps } = useQuery<any[]>({
    queryKey: [`/api/processes/${parsedId}/steps`],
    enabled: !!process,
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

  // Return mutation
  const returnMutation = useMutation({
    mutationFn: async ({ departmentId, comment }: { departmentId: number; comment: string }) => {
      const response = await apiRequest("POST", `/api/processes/${parsedId}/return`, {
        departmentId,
        comment
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
        title: "Erro ao retornar processo",
        description: error.message || "Não foi possível retornar o processo",
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
  const { data: processSteps } = useQuery<any[]>({
    queryKey: [`/api/processes/${parsedId}/steps`],
    enabled: !!process,
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
    // Verificar se NPP completou suas etapas principais
    const isNPPCompleted = () => {
      const nppSteps = [
        "Pesquisa de Preços",
        "Mapa Comparativo de Preços"
      ];
      
      return nppSteps.every(stepName => {
        const step = processSteps?.find(s => s.stepName === stepName);
        return step?.isCompleted;
      });
    };

    // Lógica das etapas baseada no departamento e modalidade
    const stepsByDepartment: Record<string, any[]> = {
      "Setor Demandante": [
        { name: "Documento de Formalização da Demanda - DFD", phase: "Iniciação" },
        { name: "Estudo Técnico Preliminar - ETP", phase: "Iniciação" },
        { name: "Mapa de Risco - MR", phase: "Iniciação" },
        { name: "Termo de Referência - TR", phase: "Iniciação" }
      ],
      "Divisão de Licitação": [
        { name: "Criar Processo - Órgão", phase: "Preparação" },
        { name: "Fazer Pesquisa de Preço - Órgão", phase: "Preparação" },
        { name: "Solicitar Pesquisa de Preços", phase: "Preparação" },
        // Estas etapas só aparecem após NPP completar
        ...(isNPPCompleted() ? [
          { name: "Inserir Pesquisa no Sistema", phase: "Execução" },
          { name: "Solicitar Análise Orçamentária", phase: "Execução" },
        ] : [])
      ],
      "Núcleo de Pesquisa de Preços – NPP": [
        { name: "Pesquisa de Preços", phase: "Preparação" },
        { name: "Mapa Comparativo de Preços", phase: "Preparação" }
      ],
      "Unidade de Orçamento e Finanças": [
        { name: "Informar Disponibilidade Orçamentária p/ Emissão de R.O.", phase: "Execução" }
      ],
      "Secretário de Estado da Administração Penitenciária - SEAP": [
        { name: "Autorização pelo Secretário SEAP", phase: "Autorização" }
      ]
    };
    return stepsByDepartment[departmentName] || [];
  };

  // Verificar se todas as etapas do setor atual estão concluídas
  const currentDepartment = departments?.find(d => d.id === process.currentDepartmentId);
  const currentDepartmentName = currentDepartment?.name || "";
  
  // ESPECIAL: Verificar se estamos na Divisão de Licitação com etapa de correção
  let expectedSteps: any[] = [];
  let currentDepartmentSteps: any[] = [];
  let allStepsCompleted = false;
  
  if (process.currentDepartmentId === 2) {
    // Divisão de Licitação - validação simplificada
    
    // PRIORIDADE 1: Arquivamento
    const archiveFinalStep = processSteps?.find(s => 
      s.stepName === "Arquivar processo - Final" && s.departmentId === 2
    );
    
    const archiveFromDemandante = processSteps?.find(s => 
      s.stepName === "Arquivar processo" && s.departmentId === 1 && s.isCompleted === true
    );
    
    if (archiveFinalStep || archiveFromDemandante) {
      expectedSteps = [{ name: "Arquivar processo - Final" }];
      currentDepartmentSteps = processSteps?.filter(step => 
        step.stepName === "Arquivar processo - Final"
      ) || [];
    } else {
      // PRIORIDADE 2: Correção
      const correctionStep = processSteps?.find(s => 
        s.stepName === "Devolver para correção ou cancelar processo" && s.departmentId === 2
      );
      
      if (correctionStep) {
        expectedSteps = [{ name: "Devolver para correção ou cancelar processo" }];
        currentDepartmentSteps = [correctionStep];
      } else {
        // PADRÃO: Fluxo normal
        expectedSteps = getSectorSteps(currentDepartmentName, process.modalityId);
        currentDepartmentSteps = processSteps?.filter(step => 
          expectedSteps.some(expectedStep => expectedStep.name === step.stepName)
        ) || [];
      }
    }
  } else if (process.currentDepartmentId === 5) {
    // Secretário de Estado - verificar se existe etapa intermediária
    const intermediateStep = processSteps?.find(s => 
      s.stepName === "Devolver para correção ou arquivamento"
    );
    
    if (intermediateStep) {
      // Se existe etapa intermediária, validar apenas ela se não estiver completa
      if (!intermediateStep.isCompleted) {
        expectedSteps = [{ name: "Devolver para correção ou arquivamento" }];
        currentDepartmentSteps = [intermediateStep];
      } else {
        // Se já está completa, usar lógica normal
        expectedSteps = getSectorSteps(currentDepartmentName, process.modalityId);
        currentDepartmentSteps = processSteps?.filter(step => 
          expectedSteps.some(expectedStep => expectedStep.name === step.stepName)
        ) || [];
      }
    } else {
      // Contexto normal do Secretário de Estado
      expectedSteps = getSectorSteps(currentDepartmentName, process.modalityId);
      currentDepartmentSteps = processSteps?.filter(step => 
        expectedSteps.some(expectedStep => expectedStep.name === step.stepName)
      ) || [];
    }
  } else if (process.currentDepartmentId === 1) {
    // Setor Demandante - verificar se está no contexto de arquivamento
    const archiveStep = processSteps?.find(s => 
      s.stepName === "Arquivar processo" && s.departmentId === 1
    );
    
    if (archiveStep) {
      // Se existe etapa de arquivamento, validar apenas ela
      expectedSteps = [{ name: "Arquivar processo" }];
      currentDepartmentSteps = [archiveStep];
    } else {
      // Contexto normal do Setor Demandante
      expectedSteps = getSectorSteps(currentDepartmentName, process.modalityId);
      currentDepartmentSteps = processSteps?.filter(step => 
        expectedSteps.some(expectedStep => expectedStep.name === step.stepName)
      ) || [];
    }
  } else {
    // Outros departamentos - lógica normal
    expectedSteps = getSectorSteps(currentDepartmentName, process.modalityId);
    currentDepartmentSteps = processSteps?.filter(step => 
      expectedSteps.some(expectedStep => expectedStep.name === step.stepName)
    ) || [];
  }
  
  const incompleteSteps = currentDepartmentSteps.filter(step => !step.isCompleted);
  allStepsCompleted = expectedSteps.length > 0 && currentDepartmentSteps.length >= expectedSteps.length && incompleteSteps.length === 0;
  
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
  
  // Determinar os departamentos disponíveis baseado no fluxo específico
  const availableDepartments: Department[] = [];
  
  // Função auxiliar para verificar se NPP completou suas etapas
  const isNPPCompleted = () => {
    const nppSteps = [
      "Pesquisa de Preços",
      "Mapa Comparativo de Preços"
    ];
    
    return nppSteps.every(stepName => {
      const step = processSteps?.find(s => s.stepName === stepName);
      return step?.isCompleted;
    });
  };

  // Fluxo customizado baseado no departamento atual
  if (process.currentDepartmentId === 1) {
    // Setor Demandante → Divisão de Licitação
    const nextDepartment = departments?.find(d => d.id === 2);
    if (nextDepartment) availableDepartments.push(nextDepartment);
  } else if (process.currentDepartmentId === 2) {
    // Divisão de Licitação - lógica simplificada baseada em prioridades
    
    // PRIORIDADE 1: Arquivamento final concluído = processo finalizado
    const archiveFinalCompleted = processSteps?.find(s => 
      s.stepName === "Arquivar processo - Final" && s.departmentId === 2 && s.isCompleted
    );
    
    if (archiveFinalCompleted) {
      console.log("🔍 TRANSFER - Processo arquivado, bloqueando transferências");
      // availableDepartments fica vazio = sem transferências
    } else {
      // PRIORIDADE 2: Verificar se é fluxo de correção concluído
      const correctionCompleted = processSteps?.find(s => 
        s.stepName === "Devolver para correção ou cancelar processo" && s.departmentId === 2 && s.isCompleted
      );
      
      if (correctionCompleted) {
        // Correção concluída → pode ir para Setor Demandante
        const setorDemandante = departments?.find(d => d.id === 1);
        if (setorDemandante) availableDepartments.push(setorDemandante);
      } else {
        // PRIORIDADE 3: Fluxo normal baseado no NPP
        if (isNPPCompleted()) {
          const nextDepartment = departments?.find(d => d.id === 4);
          if (nextDepartment) availableDepartments.push(nextDepartment);
        } else {
          const nextDepartment = departments?.find(d => d.id === 3);
          if (nextDepartment) availableDepartments.push(nextDepartment);
        }
      }
    }
  } else if (process.currentDepartmentId === 3) {
    // NPP → Divisão de Licitação (retorno)
    const nextDepartment = departments?.find(d => d.id === 2);
    if (nextDepartment) availableDepartments.push(nextDepartment);
  } else if (process.currentDepartmentId === 4) {
    // Unidade de Orçamento e Finanças → Secretário SEAP
    const nextDepartment = departments?.find(d => d.id === 5);
    if (nextDepartment) availableDepartments.push(nextDepartment);
  } else if (process.currentDepartmentId === 5) {
    // Secretário SEAP - depois da autorização, pode ir para diferentes fluxos
    
    // Verificar se tem etapa de autorização concluída ou rejeitada
    const authStep = processSteps?.find(s => s.stepName === "Autorização pelo Secretário SEAP" && s.isCompleted);
    if (authStep) {
      // Se foi rejeitada especificamente com "Não autorizar a defesa", permite tramitar para Divisão de Licitação
      if (authStep.rejectionStatus === "Não autorizar a defesa ou solicitar reformulação da demanda") {
        const divisaoLicitacao = departments?.find(d => d.id === 2);
        if (divisaoLicitacao) availableDepartments.push(divisaoLicitacao);
      }
      // Baseado na decisão da autorização, liberar departamentos específicos
      else if (authStep.observations?.includes("INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL")) {
        // Pode transferir para Unidade de Orçamento e Finanças (Fluxo Repror)
        const orcamentoFinancas = departments?.find(d => d.id === 6);
        if (orcamentoFinancas) availableDepartments.push(orcamentoFinancas);
      } else if (authStep.observations?.includes("DISPONIBILIDADE ORÇAMENTÁRIA")) {
        // Permanece no mesmo setor (SEAP) para AUTORIZAR EMISSÃO DE R.O.
        const seap = departments?.find(d => d.id === 5);
        if (seap) availableDepartments.push(seap);
      } else if (authStep.observations?.includes("Recurso de convênio insuficiente")) {
        // Verificar se a etapa de ajuste foi concluída
        const adjustmentStep = processSteps?.find(s => s.stepName === "Solicitar ajuste/aditivo do plano de trabalho" && s.isCompleted);
        if (adjustmentStep) {
          // Pode transferir para SUBCC para reavaliação do plano de trabalho
          const subcc = departments?.find(d => d.id === 11);
          if (subcc) availableDepartments.push(subcc);
        }
      }
    }
  } else {
    // Fluxo sequencial padrão para outros departamentos
    if (currentIndex !== -1 && currentIndex < departmentFlow.length - 1) {
      const nextDepartmentId = departmentFlow[currentIndex + 1];
      const nextDepartment = departments?.find(d => d.id === nextDepartmentId);
      if (nextDepartment) {
        availableDepartments.push(nextDepartment);
      }
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
              {/* Mostrar departamento atual */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 p-4 rounded-lg border-2 bg-blue-50 border-blue-400 text-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{currentDepartmentName}</h4>
                      <p className="text-sm opacity-75">Atual</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        Departamento Atual
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seta indicando transferência */}
              {availableDepartments.length > 0 && (
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-orange-500" />
                </div>
              )}

              {/* Mostrar próximo departamento disponível */}
              {availableDepartments.length > 0 ? (
                availableDepartments.map((dept) => (
                  <div key={dept.id} className="flex items-center space-x-3">
                    <div className="flex-1 p-4 rounded-lg border-2 bg-orange-50 border-orange-300 text-orange-800 border-dashed">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{dept.name}</h4>
                          <p className="text-sm opacity-75">Próximo</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                            Destino
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="flex-1 p-4 rounded-lg border-2 bg-green-50 border-green-300 text-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Processo Finalizado</h4>
                        <p className="text-sm opacity-75">Não há mais departamentos para transferência</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                          Concluído
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fluxo sequencial padrão (oculto, mantido apenas para referência) */}
            <div className="hidden space-y-4">
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

          {/* Painel de Retorno */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5 text-yellow-600" />
                  Retornar Processo
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReturnPanel(!showReturnPanel)}
                >
                  {showReturnPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {showReturnPanel && (
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowAllPrevious"
                    checked={allowAllPreviousDepartments}
                    onChange={(e) => setAllowAllPreviousDepartments(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="allowAllPrevious" className="text-sm font-medium">
                    {isAdmin ? "Permitir retorno para todos os setores" : "Permitir retorno para todos os setores anteriores"}
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Selecionar departamento de retorno:
                  </label>
                  <Select value={selectedReturnDepartment} onValueChange={setSelectedReturnDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const currentIndex = departmentFlow.findIndex(id => id === process.currentDepartmentId);
                        const availableForReturn = [];
                        
                        if (allowAllPreviousDepartments) {
                          if (isAdmin) {
                            // Administradores podem retornar para TODOS os departamentos
                            availableForReturn.push(...(departments || []));
                          } else {
                            // Usuários normais: apenas departamentos anteriores
                            for (let i = 0; i < currentIndex; i++) {
                              const dept = departments?.find(d => d.id === departmentFlow[i]);
                              if (dept) availableForReturn.push(dept);
                            }
                          }
                        } else {
                          // Apenas o departamento anterior
                          if (currentIndex > 0) {
                            const dept = departments?.find(d => d.id === departmentFlow[currentIndex - 1]);
                            if (dept) availableForReturn.push(dept);
                          }
                        }
                        
                        return availableForReturn.map(dept => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Motivo do retorno *
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Descreva detalhadamente o motivo do retorno (mínimo 50 caracteres)..."
                    id="returnComment"
                    onChange={(e) => {
                      const chars = e.target.value.length;
                      const counter = document.getElementById('charCounter');
                      if (counter) {
                        counter.textContent = `${chars}/50 caracteres`;
                        counter.className = chars >= 50 ? "text-green-600 text-xs mt-1" : "text-red-600 text-xs mt-1";
                      }
                    }}
                  />
                  <div 
                    id="charCounter" 
                    className="text-red-600 text-xs mt-1"
                  >
                    0/50 caracteres
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!selectedReturnDepartment || returnMutation.isPending}
                  onClick={() => {
                    const comment = (document.getElementById('returnComment') as HTMLTextAreaElement)?.value;
                    if (!comment.trim()) {
                      toast({
                        title: "Motivo obrigatório",
                        description: "Por favor, informe o motivo do retorno",
                        variant: "destructive"
                      });
                      return;
                    }
                    if (comment.trim().length < 50) {
                      toast({
                        title: "Motivo insuficiente",
                        description: "O motivo do retorno deve ter pelo menos 50 caracteres",
                        variant: "destructive"
                      });
                      return;
                    }
                    returnMutation.mutate({
                      departmentId: parseInt(selectedReturnDepartment),
                      comment: comment.trim()
                    });
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {returnMutation.isPending ? "Retornando..." : "Confirmar Retorno"}
                </Button>
              </CardContent>
            )}
          </Card>

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