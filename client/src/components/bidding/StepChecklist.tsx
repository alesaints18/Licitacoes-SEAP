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
  DialogFooter,
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
  
  // Estados para o modal de decisão do Secretário SEAP
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [stepForDecision, setStepForDecision] = useState<ProcessStep | null>(null);
  const [primaryDecision, setPrimaryDecision] = useState<string>("");
  const [cascadeDecision, setCascadeDecision] = useState<string>("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [showAuthorizationField, setShowAuthorizationField] = useState(false);
  const [authorizationDecision, setAuthorizationDecision] = useState("");
  const [authorizationModalOpen, setAuthorizationModalOpen] = useState(false);
  
  // Fetch process steps
  const { data: steps, isLoading, error } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${processId}/steps`],
  });
  
  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['/api/departments'],
  });
  
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/status'],
  });
  
  // Mapeamento de departamentos por nome
  const departmentMap: { [key: string]: number } = {
    "Setor Demandante": 1,
    "Divisão de Licitação": 2,
    "Núcleo de Pesquisa de Preços – NPP": 3,
    "Unidade de Orçamento e Finanças": 4,
    "Secretário de Estado da Administração Penitenciária - SEAP": 5,
    // Mapeamentos adicionais para compatibilidade
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
  
  // Filtrar etapas do setor atual, mostrando apenas as pendentes (não concluídas)
  const filteredSteps = steps?.filter(step => {
    const currentDeptId = departmentMap[userDepartment];
    
    // Excluir etapas de "Transferência de Setor" (são automáticas)
    if (step.stepName === "Transferência de Setor") {
      return false;
    }
    
    // Mostrar etapas do departamento atual (concluídas e não concluídas)
    // Para etapa de Autorização, sempre mostrar mesmo se concluída para poder editar decisão
    if (step.stepName === "Autorização pelo Secretário SEAP") {
      console.log("🔍 Verificando etapa de Autorização:", {
        stepName: step.stepName,
        stepDepartmentId: step.departmentId,
        currentDeptId,
        userDepartment,
        isAdmin: (currentUser as any)?.role === 'admin'
      });
      // Admin pode ver todas as etapas de autorização
      if ((currentUser as any)?.role === 'admin') {
        return true;
      }
      return step.departmentId === currentDeptId;
    }
    // Para outras etapas, mostrar apenas não concluídas
    return step.departmentId === currentDeptId && !step.isCompleted;
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

  // Função para criar etapas condicionais no setor SEAP
  const createConditionalStepsIfNeeded = async () => {
    const conditionalSteps = [
      "Devolver para correção ou arquivamento",
      "Solicitar ajuste/aditivo do plano de trabalho", 
      "Solicitar disponibilização de orçamento",
      "Autorizar emissão de R.O."
    ];
    
    for (const stepName of conditionalSteps) {
      const existingStep = steps?.find(s => s.stepName === stepName && s.departmentId === 5);
      if (!existingStep) {
        console.log(`Criando etapa condicional: ${stepName}`);
        const response = await apiRequest("POST", `/api/processes/${processId}/steps`, {
          stepName: stepName,
          departmentId: 5, // SEAP
          isCompleted: false,
          isLocked: true, // Bloqueada até decisão de autorização
          observations: "Etapa condicional - aguardando decisão de autorização"
        });
        
        console.log(`Etapa ${stepName} criada:`, response.ok);
        
        // Forçar bloqueio via SQL caso não tenha funcionado no POST
        if (response.ok) {
          const stepData = await response.json();
          await apiRequest("PATCH", `/api/processes/${processId}/steps/${stepData.id}`, {
            isLocked: true
          });
        }
      }
    }
    
    queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
  };

  // Effect para criar etapas condicionais quando há etapa de autorização
  useEffect(() => {
    if (steps && processId) {
      const hasAuthorizationStep = steps.find(s => s.stepName === "Autorização pelo Secretário SEAP");
      if (hasAuthorizationStep) {
        createConditionalStepsIfNeeded();
      }
    }
  }, [steps, processId]);
  
  const handleStepClick = (step: ProcessStep) => {
    setActiveStep(step);
    setObservation(step.observations || "");
  };
  
  const handleToggleStep = async (step: ProcessStep) => {
    console.log("🔍 handleToggleStep chamado:", {
      stepName: step.stepName,
      isCompleted: step.isCompleted,
      stepId: step.id,
      isLocked: step.isLocked
    });
    
    // BLOQUEIO ABSOLUTO: Verificar se a etapa está bloqueada primeiro
    if (step.isLocked && !step.isCompleted) {
      console.log("🚫 ETAPA BLOQUEADA - Impedindo ação");
      toast({
        title: "Etapa Bloqueada",
        description: "Esta etapa só pode ser acessada após uma decisão na 'Autorização pelo Secretário SEAP'",
        variant: "destructive"
      });
      return;
    }
    
    try {

      // Se é etapa de Autorização pelo Secretário SEAP, abrir modal em branco
      if (step.stepName === "Autorização pelo Secretário SEAP") {
        console.log("🔥 Etapa de Autorização detectada - abrindo modal");
        setAuthorizationModalOpen(true);
        setActiveStep(step);
        return; // Não continua com a conclusão ainda
      }

      // Se é etapa "SOLICITAR DISPONIBILIZAÇÃO DE ORÇAMENTO", criar próxima etapa baseada na decisão da autorização
      if (step.stepName === "SOLICITAR DISPONIBILIZAÇÃO DE ORÇAMENTO" && !step.isCompleted) {
        // Buscar a etapa de autorização anterior para saber qual foi a decisão
        const authStep = steps?.find(s => s.stepName === "Autorização pelo Secretário SEAP" && s.isCompleted);
        
        if (authStep?.observations) {
          let nextStepName = "";
          let nextDepartmentId = step.departmentId; // Por padrão, mesmo departamento
          
          if (authStep.observations.includes("INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL")) {
            nextStepName = "Fluxo Repror";
            nextDepartmentId = 4; // Unidade de Orçamento e Finanças
          }
          
          // Concluir a etapa atual primeiro
          const updateResponse = await apiRequest("PATCH", `/api/processes/${processId}/steps/${step.id}`, {
            isCompleted: true,
            observations: `Etapa concluída baseada na decisão: ${authStep.observations}`
          });
          
          if (updateResponse.ok && nextStepName) {
            // Criar próxima etapa
            await apiRequest("POST", `/api/processes/${processId}/steps`, {
              stepName: nextStepName,
              departmentId: nextDepartmentId,
              isCompleted: false,
              observations: `Criada automaticamente após conclusão de SOLICITAR DISPONIBILIZAÇÃO DE ORÇAMENTO`
            });
          }
          
          queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
          toast({
            title: "Etapa concluída",
            description: nextStepName ? `Próxima etapa: ${nextStepName}` : "Etapa concluída com sucesso"
          });
          return;
        }
      }

      // Se é etapa "Fluxo Repror", arquivar automaticamente quando concluída
      if (step.stepName === "Fluxo Repror" && !step.isCompleted) {
        // Concluir a etapa
        const updateResponse = await apiRequest("PATCH", `/api/processes/${processId}/steps/${step.id}`, {
          isCompleted: true,
          observations: "Fluxo Repror concluído - processo será arquivado automaticamente"
        });
        
        if (updateResponse.ok) {
          // Arquivar o processo automaticamente
          const archiveResponse = await apiRequest("DELETE", `/api/processes/${processId}`, {
            reason: "Processo arquivado automaticamente após conclusão do Fluxo Repror (Indisponibilidade Orçamentária)"
          });
          
          if (archiveResponse.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
            toast({
              title: "Processo arquivado",
              description: "Fluxo Repror concluído. Processo arquivado automaticamente por indisponibilidade orçamentária.",
              variant: "default"
            });
            
            // Redirecionar para lista de processos
            setTimeout(() => {
              window.location.href = "/processes";
            }, 2000);
          }
        }
        return;
      }

      // Se a etapa não existe, criar primeiro
      if (!step.id) {
        const createResponse = await apiRequest("POST", `/api/processes/${processId}/steps`, {
          stepName: step.stepName,
          departmentId: step.departmentId,
          isCompleted: true,
          observations: null,
          isLocked: step.isLocked || false
        });
        
        if (createResponse.ok) {
          // Refetch steps after creating
          queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
          
          toast({
            title: "Etapa criada e concluída",
            description: `Etapa "${step.stepName}" foi criada e marcada como concluída`,
          });
        }
      } else {
        // Atualizar etapa existente
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
      }
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

  // Função para completar a autorização com a decisão escolhida
  const handleAuthorizationComplete = async () => {
    if (!activeStep || !authorizationDecision) return;
    
    try {
      // Completar a etapa com a decisão de autorização como observação
      if (!activeStep.id) {
        // Criar etapa se não existe
        await apiRequest("POST", `/api/processes/${processId}/steps`, {
          stepName: activeStep.stepName,
          departmentId: activeStep.departmentId,
          isCompleted: true,
          observations: `AUTORIZAÇÃO: ${authorizationDecision}`
        });
      } else {
        // Atualizar etapa existente
        await apiRequest("PATCH", `/api/processes/${processId}/steps/${activeStep.id}`, {
          isCompleted: true,
          observations: `AUTORIZAÇÃO: ${authorizationDecision}`
        });
      }
      
      // Liberar etapa específica baseada na decisão
      let stepToUnlock = "";
      if (authorizationDecision === "INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL") {
        stepToUnlock = "Solicitar disponibilização de orçamento";
      } else if (authorizationDecision === "DISPONIBILIDADE ORÇAMENTÁRIA") {
        stepToUnlock = "Autorizar emissão de R.O.";
      }
      
      // Liberar a etapa correspondente
      if (stepToUnlock) {
        const stepToUnlockObj = steps?.find(s => s.stepName === stepToUnlock && s.departmentId === 5);
        if (stepToUnlockObj) {
          await apiRequest("PATCH", `/api/processes/${processId}/steps/${stepToUnlockObj.id}`, {
            observations: `Etapa liberada pela decisão: ${authorizationDecision}`,
            isLocked: false // Desbloquear a etapa
          });
        }
      }
      
      // Refetch steps after updating
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
      
      toast({
        title: "Etapa de Autorização concluída",
        description: `Decisão: ${authorizationDecision}. Próxima etapa: ${nextStepName}`,
      });
      
      // Limpar estados
      setShowAuthorizationField(false);
      setAuthorizationDecision("");
      setActiveStep(null);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível completar a autorização",
        variant: "destructive",
      });
    }
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

  const submitDecision = async () => {
    if (!stepForDecision || !primaryDecision) {
      toast({
        title: "Decisão incompleta",
        description: "Por favor, selecione uma opção",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingDecision(true);

    try {
      // Concluir a etapa com a decisão tomada
      await apiRequest("PATCH", `/api/processes/${processId}/steps/${stepForDecision.id}`, {
        isCompleted: true,
        observations: `DECISÃO: ${primaryDecision}`
      });
      
      // Processar ações baseadas na decisão
      // (aqui podem ser adicionadas ações específicas se necessário)
      
      // Refetch steps after updating
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/steps`] });
      
      toast({
        title: "Autorização processada",
        description: `Decisão: ${primaryDecision} → ${cascadeDecision}`,
        variant: "default",
      });

      // Fechar modal
      setDecisionModalOpen(false);
      setStepForDecision(null);
      setPrimaryDecision("");
      setCascadeDecision("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível processar a decisão",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const processDecisionActions = async (primary: string, cascade: string) => {
    // Implementar ações baseadas nas decisões
    if (primary === "NÃO") {
      if (cascade === "NÃO AUTORIZAR A DESPESA OU SOLICITAR REFORMULAÇÃO DA DEMANDA") {
        // Lógica para devolver para correção ou arquivamento
        // Será implementada em seguida
        console.log("Processo devolvido para correção ou arquivamento");
      } else if (cascade === "RECURSO DE CONVÊNIO INSUFICIENTE - VALOR ESTIMADO NA PESQUISA MAIOR QUE O VALOR CONVENIADO") {
        // Lógica para encaminhar para SUBCC
        console.log("Processo encaminhado para SUBCC");
      }
    } else if (primary === "SIM") {
      if (cascade === "INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL") {
        // Lógica para indisponibilidade orçamentária
        console.log("Indisponibilidade orçamentária processada");
      } else if (cascade === "DISPONIBILIDADE ORÇAMENTÁRIA") {
        // Lógica para disponibilidade orçamentária - continua fluxo normal
        console.log("Disponibilidade orçamentária confirmada - processo continua");
      }
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
              {/* Resumo de etapas concluídas */}
              {(() => {
                const currentDeptId = departmentMap[userDepartment];
                const allSectorSteps = steps?.filter(step => 
                  step.departmentId === currentDeptId && 
                  step.stepName !== "Transferência de Setor"
                ) || [];
                const completedSteps = allSectorSteps.filter(step => step.isCompleted);
                
                if (completedSteps.length > 0) {
                  return (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">
                          ✓ {completedSteps.length} de {allSectorSteps.length} etapas concluídas
                        </span>
                        <span className="text-xs text-green-600">
                          (etapas concluídas ocultas)
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
                          className={`flex items-start space-x-3 p-3 rounded-md border ${
                            step.isLocked ? 
                              "bg-gray-100 border-gray-300 opacity-60" :
                              activeStep && activeStep.id === step.id ? 
                                "bg-white border-blue-500 shadow-md" : 
                                "bg-white border-gray-200"
                          } ${step.isLocked ? "cursor-not-allowed" : "cursor-pointer hover:shadow-sm"} transition-shadow`}
                          onClick={() => !step.isLocked && handleStepClick(step)}
                        >
                          <Checkbox 
                            id={`step-${step.id}`} 
                            checked={step.isCompleted}
                            disabled={step.isLocked && !step.isCompleted}
                            onCheckedChange={(checked) => {
                              if (step.isLocked && !step.isCompleted) {
                                toast({
                                  title: "Etapa Bloqueada",
                                  description: "Esta etapa só pode ser acessada após uma decisão na 'Autorização pelo Secretário SEAP'",
                                  variant: "destructive"
                                });
                                return;
                              }
                              handleToggleStep(step);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label
                              htmlFor={`step-${step.id}`}
                              className={`text-sm font-medium ${
                                step.isLocked ? "text-gray-400" :
                                step.isCompleted ? "line-through text-gray-500" : 
                                step.observations && step.observations.startsWith("REJEITADA:") ? "text-red-600" :
                                "text-gray-800"
                              }`}
                            >
                              {step.stepName}
                              {step.isLocked && (
                                <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                                  🔒 Bloqueada
                                </span>
                              )}
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
                                // Para etapa de Autorização, abrir modal de aprovação
                                if (step.stepName === "Autorização pelo Secretário SEAP") {
                                  setAuthorizationModalOpen(true);
                                  setActiveStep(step);
                                } else {
                                  handleRejectStep(step);
                                }
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
                <p className="text-sm font-medium mb-2">
                  Etapa: {activeStep.stepName === "Autorização pelo Secretário SEAP" ? "Autorização" : activeStep.stepName}
                </p>
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

      {/* Campo de Autorização - aparece apenas quando clica em "Etapa concluída" na etapa de autorização */}
      {showAuthorizationField && activeStep?.stepName === "Autorização pelo Secretário SEAP" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              🏛️ Decisão de Autorização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Escolha uma das opções de autorização antes de concluir a etapa:
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="authorization-decision"
                      value="INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL"
                      checked={authorizationDecision === "INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL"}
                      onChange={(e) => setAuthorizationDecision(e.target.value)}
                      className="mt-1"
                    />
                    <span className="text-sm font-medium text-red-700">
                      ❌ INDISPONIBILIDADE ORÇAMENTÁRIA TOTAL OU PARCIAL
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="authorization-decision"
                      value="DISPONIBILIDADE ORÇAMENTÁRIA"
                      checked={authorizationDecision === "DISPONIBILIDADE ORÇAMENTÁRIA"}
                      onChange={(e) => setAuthorizationDecision(e.target.value)}
                      className="mt-1"
                    />
                    <span className="text-sm font-medium text-green-700">
                      ✅ DISPONIBILIDADE ORÇAMENTÁRIA
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAuthorizationField(false);
                    setAuthorizationDecision("");
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!authorizationDecision}
                  onClick={handleAuthorizationComplete}
                >
                  Confirmar e Concluir Etapa
                </Button>
              </div>
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

      {/* Modal em Branco para Autorização */}
      <Dialog open={authorizationModalOpen} onOpenChange={setAuthorizationModalOpen}>
        <DialogContent className="sm:max-w-md">
          {/* Modal em branco conforme solicitado */}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default StepChecklist;
