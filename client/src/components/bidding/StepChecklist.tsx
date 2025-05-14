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
  
  // For simplicity, we'll use preset steps for each modality
  const getDefaultSteps = () => {
    // Common steps for all modalities
    const commonSteps = [
      { name: "Elaboração do Termo de Referência", departmentId: 1 },
      { name: "Pesquisa de Preço", departmentId: 1 },
      { name: "Aprovação do Ordenador de Despesa", departmentId: 4 },
    ];
    
    // Additional steps based on modality
    switch (modalityId) {
      case 1: // Pregão Eletrônico
        return [
          ...commonSteps,
          { name: "Elaboração do Edital", departmentId: 1 },
          { name: "Publicação do Edital", departmentId: 1 },
          { name: "Sessão de Lances", departmentId: 1 },
          { name: "Análise de Documentação", departmentId: 1 },
          { name: "Homologação", departmentId: 1 },
          { name: "Contratação", departmentId: 2 },
        ];
      case 2: // Concorrência
        return [
          ...commonSteps,
          { name: "Elaboração do Edital", departmentId: 1 },
          { name: "Publicação do Edital", departmentId: 1 },
          { name: "Recebimento de Propostas", departmentId: 1 },
          { name: "Julgamento", departmentId: 1 },
          { name: "Homologação", departmentId: 1 },
          { name: "Contratação", departmentId: 2 },
        ];
      case 3: // Dispensa
        return [
          ...commonSteps,
          { name: "Justificativa da Dispensa", departmentId: 1 },
          { name: "Habilitação do Fornecedor", departmentId: 1 },
          { name: "Ratificação", departmentId: 1 },
          { name: "Contratação", departmentId: 2 },
        ];
      case 4: // Inexigibilidade
        return [
          ...commonSteps,
          { name: "Justificativa da Inexigibilidade", departmentId: 1 },
          { name: "Comprovação de Exclusividade", departmentId: 1 },
          { name: "Ratificação", departmentId: 1 },
          { name: "Contratação", departmentId: 2 },
        ];
      default:
        return commonSteps;
    }
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
              isCompleted: false
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
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Checklist de Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p>Nenhuma etapa cadastrada para este processo</p>
          ) : (
            <div className="space-y-4">
              {steps.map((step) => (
                <div 
                  key={step.id} 
                  className={`flex items-start space-x-3 p-3 rounded-md border ${
                    activeStep && activeStep.id === step.id ? "border-primary bg-primary-50" : "border-gray-200"
                  } cursor-pointer`}
                  onClick={() => handleStepClick(step)}
                >
                  <Checkbox 
                    id={`step-${step.id}`} 
                    checked={step.isCompleted}
                    onCheckedChange={() => handleToggleStep(step)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={`step-${step.id}`}
                      className={`text-sm font-medium ${step.isCompleted ? "line-through text-gray-500" : ""}`}
                    >
                      {step.stepName}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Setor: {departments?.find(d => d.id === step.departmentId)?.name || `Setor ${step.departmentId}`}
                    </p>
                    {step.completedAt && (
                      <p className="text-xs text-green-600">
                        Concluído em: {new Date(step.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
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
