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

interface StepChecklistProps {
  processId: number;
  modalityId: number;
}

const StepChecklist = ({ processId, modalityId }: StepChecklistProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<ProcessStep | null>(null);
  const [observation, setObservation] = useState("");
  
  // Fetch process steps
  const { data: steps, isLoading, error } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${processId}/steps`],
  });
  
  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['/api/departments'],
  });
  
  // Checklist baseado no fluxograma oficial do Pregão Eletrônico SEAP/PB
  const getDefaultSteps = () => {
    // Etapas específicas para Pregão Eletrônico conforme fluxograma oficial
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
  
  // Agrupar etapas por fase
  const stepsByPhase = steps?.reduce((acc, step) => {
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
  }, {} as Record<string, typeof steps>) || {};

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
                              className={`text-sm font-medium ${step.isCompleted ? "line-through text-gray-500" : "text-gray-800"}`}
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
    </div>
  );
};

export default StepChecklist;
