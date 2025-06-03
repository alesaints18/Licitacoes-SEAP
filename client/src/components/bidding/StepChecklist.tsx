import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProcessStep } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StepChecklistProps {
  processId: number;
  modalityId: number;
  userDepartment: string;
}

const StepChecklist = ({ processId, modalityId, userDepartment }: StepChecklistProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<ProcessStep | null>(null);
  const [observation, setObservation] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [stepToReject, setStepToReject] = useState<ProcessStep | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);
  
  // Fetch process steps
  const { data: steps, isLoading, error } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${processId}/steps`],
  });
  
  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['/api/departments'],
  });
  
  // Mapeamento de departamentos por nome
  const departmentMap: { [key: string]: number } = {
    "TI": 1,
    "Licitações": 2,
    "Jurídico": 3,
    "Financeiro": 4,
    "Administrativo": 5
  };

  // Checklist específico por setor baseado no fluxograma do Pregão Eletrônico
  const getSectorSpecificSteps = () => {
    if (modalityId !== 1) return []; // Apenas para Pregão Eletrônico
    
    const currentDeptId = departmentMap[userDepartment];
    
    // Etapas por setor conforme fluxograma oficial
    const stepsBySector: { [key: number]: any[] } = {
      // TI - Setor Demandante (Fase de Iniciação)
      1: [
        { name: "1. Documento de Formalização da Demanda - DFD", departmentId: 1, phase: "Iniciação" },
        { name: "2. Estudo Técnico Preliminar - ETP", departmentId: 1, phase: "Iniciação" },
        { name: "3. Mapa de Risco - MR", departmentId: 1, phase: "Iniciação" },
        { name: "4. Termo de Referência - TR", departmentId: 1, phase: "Iniciação" },
      ],
      
      // Licitações - Divisão de Licitação (Fase de Preparação e Execução)
      2: [
        { name: "6. Criar Processo no Órgão", departmentId: 2, phase: "Preparação" },
        { name: "8. Pesquisa de Preços - NPP", departmentId: 2, phase: "Preparação" },
        { name: "9. Aprovação da Pesquisa de Preços", departmentId: 2, phase: "Preparação" },
        { name: "11. Designação do Pregoeiro e Equipe de Apoio", departmentId: 2, phase: "Preparação" },
        { name: "12. Elaboração do Edital", departmentId: 2, phase: "Preparação" },
        { name: "14. Publicação do Edital", departmentId: 2, phase: "Execução" },
        { name: "15. Recebimento das Propostas", departmentId: 2, phase: "Execução" },
        { name: "16. Sessão Pública do Pregão", departmentId: 2, phase: "Execução" },
        { name: "17. Julgamento das Propostas", departmentId: 2, phase: "Execução" },
        { name: "18. Habilitação do Vencedor", departmentId: 2, phase: "Execução" },
        { name: "19. Adjudicação", departmentId: 2, phase: "Execução" },
      ],
      
      // Jurídico - Assessoria Jurídica (Análise Legal)
      3: [
        { name: "13. Análise Jurídica do Edital", departmentId: 3, phase: "Preparação" },
        { name: "20. Análise de Recursos", departmentId: 3, phase: "Execução" },
      ],
      
      // Financeiro - Ordenador de Despesa (Autorizações e Homologação)
      4: [
        { name: "5. Autorização pelo Ordenador de Despesa", departmentId: 4, phase: "Iniciação" },
        { name: "10. Autorização da Licitação", departmentId: 4, phase: "Preparação" },
        { name: "21. Homologação", departmentId: 4, phase: "Finalização" },
        { name: "22. Empenho", departmentId: 4, phase: "Finalização" },
      ],
      
      // Administrativo - Gestão Contratual (Finalização)
      5: [
        { name: "23. Elaboração do Contrato", departmentId: 5, phase: "Finalização" },
        { name: "24. Assinatura do Contrato", departmentId: 5, phase: "Finalização" },
        { name: "25. Publicação do Contrato", departmentId: 5, phase: "Finalização" },
        { name: "26. Fiscalização Contratual", departmentId: 5, phase: "Finalização" },
      ]
    };
    
    return stepsBySector[currentDeptId] || [];
  };

  // Função para obter todas as etapas (para compatibilidade)
  const getDefaultSteps = () => {
    if (modalityId === 1) { // Pregão Eletrônico
      return [
        // FASE 1: INICIAÇÃO (Setor Demandante)
        { name: "1. Documento de Formalização da Demanda - DFD", departmentId: 1, phase: "Iniciação", timeLimit: null },
        { name: "2. Estudo Técnico Preliminar - ETP", departmentId: 1, phase: "Iniciação", timeLimit: null },
        { name: "3. Mapa de Risco - MR", departmentId: 1, phase: "Iniciação", timeLimit: null },
        { name: "4. Termo de Referência - TR", departmentId: 1, phase: "Iniciação", timeLimit: null },
        
        // DECISÃO: Ordenador de Despesa
        { name: "5. Autorização pelo Ordenador de Despesa", departmentId: 4, phase: "Iniciação", timeLimit: "10 dias" },
        
        // FASE 2: PREPARAÇÃO (Divisão de Licitação)
        { name: "6. Criar Processo no Órgão", departmentId: 2, phase: "Preparação", timeLimit: "2 dias" },
        
        // NPP - Núcleo de Pesquisa de Preços
        { name: "7. Fazer Pesquisa de Preços", departmentId: 2, phase: "Preparação", timeLimit: "2 dias" },
        { name: "8. Elaborar Mapa Comparativo de Preços", departmentId: 2, phase: "Preparação", timeLimit: "10 dias" },
        { name: "9. Metodologia da Pesquisa de Preços", departmentId: 2, phase: "Preparação", timeLimit: "10 dias" },
        
        // Orçamento e Finanças
        { name: "10. Consultar Disponibilidade Orçamentária", departmentId: 4, phase: "Preparação", timeLimit: "1 dia" },
        { name: "11. Emitir Reserva Orçamentária - R.O.", departmentId: 4, phase: "Preparação", timeLimit: "1 dia" },
        
        // FASE 3: AUTORIZAÇÃO (Secretário SEAP)
        { name: "12. Autorização Final pelo Secretário SEAP", departmentId: 5, phase: "Execução", timeLimit: null },
        
        // FASE 4: EXECUÇÃO (Divisão de Licitação)
        { name: "13. Elaborar Edital e seus Anexos", departmentId: 2, phase: "Execução", timeLimit: "10 dias" },
        { name: "14. Consultar Comitê Gestor de Gasto Público", departmentId: 2, phase: "Execução", timeLimit: "2 dias" },
        { name: "15. Solicitar Elaboração de Nota Técnica", departmentId: 3, phase: "Execução", timeLimit: "1 dia" },
        
        // FASE 5: PUBLICAÇÃO E SESSÃO
        { name: "16. Publicar Edital", departmentId: 2, phase: "Execução", timeLimit: null },
        { name: "17. Realizar Sessão Pública de Lances", departmentId: 2, phase: "Execução", timeLimit: null },
        { name: "18. Análise de Documentação dos Licitantes", departmentId: 2, phase: "Execução", timeLimit: null },
        { name: "19. Adjudicação e Homologação", departmentId: 2, phase: "Finalização", timeLimit: null },
        
        // FASE 6: CONTRATAÇÃO
        { name: "20. Elaboração do Contrato", departmentId: 3, phase: "Finalização", timeLimit: null },
        { name: "21. Assinatura do Contrato", departmentId: 5, phase: "Finalização", timeLimit: null },
      ];
    }
    
    // Para outras modalidades, manter etapas básicas
    return [
      { name: "Elaboração do Termo de Referência", departmentId: 1, phase: "Iniciação", timeLimit: null },
      { name: "Pesquisa de Preço", departmentId: 1, phase: "Preparação", timeLimit: null },
      { name: "Aprovação do Ordenador de Despesa", departmentId: 4, phase: "Execução", timeLimit: null },
    ];
  };
  
  // Filtrar etapas pelo setor atual
  const filteredSteps = steps?.filter(step => {
    const sectorSteps = getSectorSpecificSteps();
    return sectorSteps.some(sectorStep => step.stepName === sectorStep.name);
  }) || [];

  // Create initial steps if none exist
  useEffect(() => {
    const createInitialSteps = async () => {
      if (steps && steps.length === 0) {
        try {
          const defaultSteps = getDefaultSteps();
          
          for (const step of defaultSteps) {
            await apiRequest("POST", `/api/processes/${processId}/steps`, {
              stepName: step.name,
              departmentId: step.departmentId,
              isCompleted: false,
              observations: step.timeLimit ? `Prazo: ${step.timeLimit}` : null
            });
          }
          
          // Refetch steps after creating them
          queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
          
          toast({
            title: "Etapas criadas",
            description: "Etapas padrão foram criadas para este processo",
          });
        } catch (error) {
          toast({
            title: "Erro",
            description: "Não foi possível criar as etapas padrão",
            variant: "destructive",
          });
        }
      }
    };
    
    if (steps && steps.length === 0) {
      createInitialSteps();
    }
  }, [steps, processId, queryClient, modalityId, toast]);
  
  const handleStepClick = (step: ProcessStep) => {
    setActiveStep(step);
    setObservation(step.observations || "");
  };
  
  const handleToggleStep = async (step: ProcessStep) => {
    try {
      await apiRequest("PATCH", `/api/processes/${processId}/steps/${step.id}`, {
        isCompleted: !step.isCompleted,
        observations: step.observations
      });
      
      // Refetch steps after updating
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
      
      toast({
        title: step.isCompleted ? "Etapa desmarcada" : "Etapa concluída",
        description: `Etapa "${step.stepName}" ${step.isCompleted ? "desmarcada" : "marcada como concluída"}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da etapa",
        variant: "destructive",
      });
    }
  };
  
  const saveObservation = async () => {
    if (!activeStep) return;
    
    try {
      await apiRequest("PATCH", `/api/processes/${processId}/steps/${activeStep.id}`, {
        observations: observation
      });
      
      // Refetch steps after updating
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
      
      toast({
        title: "Observações salvas",
        description: "As observações foram salvas com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as observações",
        variant: "destructive",
      });
    }
  };

  const handleRejectStep = (step: ProcessStep) => {
    setStepToReject(step);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const submitRejection = async () => {
    if (!stepToReject || rejectionReason.trim().length < 100) {
      toast({
        title: "Motivo insuficiente",
        description: "O motivo da rejeição deve ter pelo menos 100 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRejection(true);

    try {
      // Marcar etapa como rejeitada através das observações
      await apiRequest("PATCH", `/api/processes/${processId}/steps/${stepToReject.id}`, {
        isCompleted: false,
        observations: `REJEITADA: ${rejectionReason.trim()}`
      });
      
      // Refetch steps after updating
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
      
      toast({
        title: "Etapa rejeitada",
        description: `Etapa "${stepToReject.stepName}" foi rejeitada com sucesso`,
        variant: "destructive",
      });

      // Fechar modal
      setRejectModalOpen(false);
      setStepToReject(null);
      setRejectionReason("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a etapa",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRejection(false);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist de Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando etapas...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !steps) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist de Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Erro ao carregar etapas</p>
        </CardContent>
      </Card>
    );
  }
  
  // Agrupar etapas filtradas por fase
  const stepsByPhase = filteredSteps?.reduce((acc, step) => {
    // Extrair fase do nome da etapa ou usar uma fase padrão
    let phase = "Execução";
    if (step.stepName.includes("DFD") || step.stepName.includes("ETP") || step.stepName.includes("Mapa de Risco") || step.stepName.includes("Termo de Referência") || step.stepName.includes("Ordenador")) {
      phase = "Iniciação";
    } else if (step.stepName.includes("Processo no Órgão") || step.stepName.includes("Pesquisa") || step.stepName.includes("Orçament") || step.stepName.includes("Reserva")) {
      phase = "Preparação";
    } else if (step.stepName.includes("Elaboração") || step.stepName.includes("Contrato") || step.stepName.includes("Assinatura") || step.stepName.includes("Adjudica") || step.stepName.includes("Homologa")) {
      phase = "Finalização";
    }
    
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(step);
    return acc;
  }, {} as Record<string, typeof filteredSteps>) || {};

  const phaseOrder = ["Iniciação", "Preparação", "Execução", "Finalização"];
  const phaseColors = {
    "Iniciação": "bg-blue-50 border-blue-200",
    "Preparação": "bg-yellow-50 border-yellow-200", 
    "Execução": "bg-green-50 border-green-200",
    "Finalização": "bg-purple-50 border-purple-200"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Checklist - Fluxograma Pregão Eletrônico
            <span className="text-sm font-normal text-gray-500">SEAP/PB</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Siga as etapas conforme o fluxograma oficial da Lei nº 14.133/2021
          </p>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p>Nenhuma etapa cadastrada para este processo</p>
          ) : (
            <div className="space-y-6">
              {phaseOrder.map((phase) => {
                const phaseSteps = stepsByPhase[phase] || [];
                if (phaseSteps.length === 0) return null;
                
                return (
                  <div key={phase} className={`p-4 rounded-lg border-2 ${phaseColors[phase as keyof typeof phaseColors]}`}>
                    <h3 className="font-semibold text-sm mb-3 uppercase tracking-wide">{phase}</h3>
                    <div className="space-y-3">
                      {phaseSteps.map((step) => (
                        <div 
                          key={step.id} 
                          className={`flex items-start space-x-3 p-3 rounded-md border bg-white ${
                            activeStep && activeStep.id === step.id ? "border-blue-500 shadow-md" : "border-gray-200"
                          } cursor-pointer hover:shadow-sm transition-shadow`}
                          onClick={() => handleStepClick(step)}
                        >
                          <Checkbox 
                            id={`step-${step.id}`} 
                            checked={step.isCompleted}
                            onCheckedChange={() => handleToggleStep(step)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label
                              htmlFor={`step-${step.id}`}
                              className={`text-sm font-medium ${
                                step.isCompleted ? "line-through text-gray-500" : 
                                step.observations && step.observations.startsWith("REJEITADA:") ? "text-red-600" :
                                "text-gray-800"
                              }`}
                            >
                              {step.stepName}
                            </Label>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>
                                Setor: {departments && Array.isArray(departments) ? 
                                  departments.find((d: any) => d.id === step.departmentId)?.name || `Setor ${step.departmentId}` :
                                  `Setor ${step.departmentId}`
                                }
                              </span>
                              {step.observations && step.observations.includes("Prazo:") && (
                                <span className="text-orange-600 font-medium">
                                  {step.observations}
                                </span>
                              )}
                            </div>
                            {step.completedAt && (
                              <p className="text-xs text-green-600">
                                ✓ Concluído em: {new Date(step.completedAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                            {step.observations && step.observations.startsWith("REJEITADA:") && (
                              <p className="text-xs text-red-600 font-medium">
                                ✗ Rejeitada: {step.observations.replace("REJEITADA: ", "")}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant={step.isCompleted ? "secondary" : "default"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStep(step);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectStep(step);
                              }}
                              className="h-7 w-7 p-0"
                              disabled={step.isCompleted}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {activeStep && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Etapa: {activeStep.stepName}</p>
                <Textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Adicione observações sobre esta etapa"
                  rows={5}
                />
              </div>
              <Button onClick={saveObservation}>Salvar Observações</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Rejeição */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rejeitar Etapa
            </DialogTitle>
            <DialogDescription>
              Você está rejeitando a etapa: <strong>{stepToReject?.stepName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Motivo da Rejeição <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Descreva detalhadamente o motivo da rejeição (mínimo 100 caracteres)"
                rows={4}
                className={rejectionReason.length < 100 ? "border-red-300" : "border-green-300"}
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs ${rejectionReason.length < 100 ? "text-red-500" : "text-green-600"}`}>
                  {rejectionReason.length < 100 ? "Insuficiente" : "Suficiente"}
                </span>
                <span className="text-xs text-gray-500">
                  {rejectionReason.length}/100 caracteres
                </span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                disabled={isSubmittingRejection}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={submitRejection}
                disabled={rejectionReason.length < 100 || isSubmittingRejection}
                className="flex-1"
              >
                {isSubmittingRejection ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StepChecklist;
