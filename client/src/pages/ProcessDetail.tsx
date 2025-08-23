import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  type ProcessWithRelations,
  type ProcessStep,
  type User,
  ProcessStatuses,
  ProcessStatus,
  ProcessPriorities,
  type ResponsibilityHistoryEntry,
  type Department,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StepChecklist from "@/components/bidding/StepChecklist";
import BiddingFlowchart from "@/components/bidding/BiddingFlowchart";
import {
  Edit,
  Trash,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRight,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  BookOpen,
  Activity,
  Building,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StatusBadge = ({ status }: { status: ProcessStatus }) => {
  const config = {
    draft: { color: "bg-gray-100 text-gray-800", label: "Rascunho" },
    in_progress: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
    completed: { color: "bg-green-100 text-green-800", label: "Concluído" },
    canceled: { color: "bg-red-100 text-red-800", label: "Cancelado" },
    overdue: { color: "bg-orange-100 text-orange-800", label: "Atrasado" },
  };

  const { color, label } = config[status] || config.draft;
  return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = {
    low: { color: "bg-green-100 text-green-800", label: "Baixa" },
    medium: { color: "bg-yellow-100 text-yellow-800", label: "Média" },
    high: { color: "bg-red-100 text-red-800", label: "Alta" },
  };

  const { color, label } = config[priority as keyof typeof config] || config.medium;
  return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>;
};

const ProcessDetail = () => {
  const { id } = useParams();
  const parsedId = parseInt(id as string);
  const [, setLocation] = useLocation();
  // Fetch current user data
  const { data: currentUser } = useQuery<{ id: number; username: string; department: string; role: string }>({
    queryKey: ["/api/auth/status"],
    retry: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [authorizationModalOpen, setAuthorizationModalOpen] = useState(false);
  const [authorizationMotivo, setAuthorizationMotivo] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch process data
  const {
    data: process,
    isLoading: isLoadingProcess,
    error: processError,
  } = useQuery<ProcessWithRelations>({
    queryKey: [`/api/processes/${parsedId}`],
    enabled: !!parsedId,
  });

  // Fetch process steps
  const {
    data: steps,
    isLoading: isLoadingSteps,
    error: stepsError,
  } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${parsedId}/steps`],
    enabled: !!parsedId,
  });

  // Fetch responsibility history
  const {
    data: responsibilityHistory,
    isLoading: isLoadingHistory,
  } = useQuery<ResponsibilityHistoryEntry[]>({
    queryKey: [`/api/processes/${parsedId}/responsibility-history`],
    enabled: !!parsedId,
  });

  // Fetch departments for department names
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const departmentMap = departments?.reduce((acc, dept) => {
    acc[dept.id] = dept.name;
    return acc;
  }, {} as Record<number, string>) || {};

  // Handle step toggle
  const handleStepToggle = async (stepId: number, isCompleted: boolean) => {
    try {
      console.log(
        `🔍 ProcessDetail handleStepToggle: ${stepId} para isCompleted: ${isCompleted}`,
      );

      const step = steps?.find((s) => s.id === stepId);
      if (!step) return;

      // Se é etapa de Autorização pelo Secretário SEAP e está sendo marcada como concluída, abrir modal
      if (step.stepName === "Autorização pelo Secretário SEAP" && isCompleted) {
        console.log(
          "🔥 Etapa de Autorização detectada - abrindo modal em branco",
        );
        setAuthorizationModalOpen(true);
        return; // Não continua com a conclusão ainda
      }

      await apiRequest("PATCH", `/api/processes/${parsedId}/steps/${stepId}`, {
        isCompleted,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${parsedId}/steps`] });
    } catch (error) {
      console.error("Error toggling step:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar etapa",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!process) return;

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/processes/${process.id}`, {
        reason: deletionReason,
      });
      
      toast({
        title: "Processo excluído",
        description: "O processo foi movido para a lixeira.",
      });
      
      setLocation("/processes");
    } catch (error) {
      console.error("Error deleting process:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir processo",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeletionReason("");
    }
  };

  if (isLoadingProcess || isLoadingSteps) return <div>Carregando...</div>;

  if (processError || stepsError || !process) {
    return <div>Erro ao carregar dados do processo</div>;
  }

  const getSectorSteps = (sector: string, modalityId: number) => {
    console.log("getSectorSteps - Input:", { userDepartment: sector, modalityId });

    const sectorMapping: Record<string, string> = {
      "Setor Demandante": "TI",
      "Divisão de Licitação": "Licitações",
      "Núcleo de Pesquisa de Preços - NPP": "NPP",
      "Assessoria Jurídica": "Jurídico",
      "Unidade de Orçamento e Finanças": "Financeiro",
      "Secretário de Estado da Administração Penitenciária - SEAP": "Administrativo",
    };

    const mappedSector = sectorMapping[sector] || sector;
    console.log("getSectorSteps - Mapped sector:", mappedSector);

    const stepsBySector: Record<string, any[]> = {
      // TI - Setor Demandante 
      TI: [
        {
          name: "Identificação da demanda",
          phase: "Iniciação",
          nextSector: "Licitações",
        },
        {
          name: "Aprovação pelo Demandante",
          phase: "Iniciação",
          nextSector: "Licitações",
        },
      ],

      // Licitações - Divisão de Licitação
      Licitações: [
        {
          name: "Elaboração do Termo de Referência",
          phase: "Iniciação",
          nextSector: "NPP",
        },
        {
          name: "Aprovação do Termo de Referência",
          phase: "Iniciação",
          nextSector: "NPP",
        },
      ],

      // NPP - Núcleo de Pesquisa de Preços
      NPP: [
        {
          name: "Pesquisa de Preços",
          phase: "Preparação",
        },
        {
          name: "Mapa Comparativo de Preços",
          phase: "Preparação",
          nextSector: "Licitações",
        },
      ],

      // Jurídico - Assessoria Jurídica
      Jurídico: [
        {
          name: "Análise jurídica do edital",
          phase: "Preparação",
          nextSector: "Financeiro",
        },
        { name: "Análise de recursos administrativos", phase: "Execução" },
        {
          name: "Elaboração da minuta do contrato",
          phase: "Finalização",
          nextSector: "Administrativo",
        },
      ],

      // Financeiro - Ordenador de Despesa
      Financeiro: [
        {
          name: "Informar Disponibilidade Orçamentária p/ Emissão de R.O.",
          phase: "Execução",
          nextSector: "Administrativo",
        },
      ],

      // Administrativo - Secretário SEAP
      Administrativo: [
        {
          name: "Autorização pelo Secretário SEAP",
          phase: "Autorização",
          requiresDecision: true,
          decisionOptions: {
            primary: [
              "NÃO AUTORIZAR A DESPESA OU SOLICITAR REFORMULAÇÃO DA DEMANDA",
              "OUTRA RECURSO DE CONVÊNIO INSUFICIMENTE - VALOR ESTIMADO NA PESQUISA MAIOR QUE O VALOR CONVENIADO",
            ],
          },
        },
        // REMOVIDAS: 4 etapas condicionais excluídas permanentemente
        // - Devolver para correção ou arquivamento
        // - Solicitar ajuste/aditivo do plano de trabalho  
        // - Solicitar disponibilização de orçamento
        // - Autorizar emissão de R.O.
      ],
    };

    const result = stepsBySector[mappedSector] || [];
    console.log(
      "getSectorSteps - stepsBySector keys:",
      Object.keys(stepsBySector),
    );
    console.log("getSectorSteps - Final result:", result);
    return result;
  };

  // Function to get next sector for a step
  const getNextSectorForStep = (stepName: string) => {
    const allSteps = [
      ...getSectorSteps("TI", 1),
      ...getSectorSteps("Licitações", 1),
      ...getSectorSteps("Jurídico", 1),
      ...getSectorSteps("Financeiro", 1),
      ...getSectorSteps("Administrativo", 1),
    ];

    const step = allSteps.find((s) => s.name === stepName);
    return step?.nextSector;
  };

  // Function to calculate deadlines by phase based on the bidding flowchart
  const getPhaseDeadlines = (processCreatedAt: Date) => {
    const createdDate = new Date(processCreatedAt);

    return {
      Iniciação: {
        name: "Fase de Iniciação",
        description:
          "Identificação da demanda até aprovação do termo de referência",
        deadline: new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 dias
        color: "blue",
      },
      Preparação: {
        name: "Fase de Preparação",
        description: "Elaboração e aprovação do edital",
        deadline: new Date(createdDate.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 dias
        color: "yellow",
      },
      Execução: {
        name: "Fase de Execução",
        description: "Publicação até adjudicação",
        deadline: new Date(createdDate.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 dias
        color: "orange",
      },
      Finalização: {
        name: "Fase de Finalização",
        description: "Contratação e entrega",
        deadline: new Date(createdDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 dias
        color: "green",
      },
      Autorização: {
        name: "Fase de Autorização",
        description: "Autorização final pelo secretário",
        deadline: new Date(createdDate.getTime() + 70 * 24 * 60 * 60 * 1000), // 70 dias
        color: "purple",
      },
    };
  };

  const phaseDeadlines = getPhaseDeadlines(new Date(process.createdAt));

  // Get current sector steps to show
  const currentUserDepartment = currentUser?.department || "";
  const sectorSteps = getSectorSteps(currentUserDepartment, process.modalityId);

  console.log("Sector steps:", sectorSteps);
  console.log("Current department:", currentUserDepartment);
  console.log("Current user department:", currentUser?.department);
  console.log("Process current department ID:", process.currentDepartmentId);

  // Map steps to show completion status
  const stepsWithStatus = sectorSteps.map((sectorStep) => {
    const existingStep = steps?.find((step) => step.stepName === sectorStep.name);
    const isCompleted = existingStep?.isCompleted || false;
    const userCanEdit = currentUser?.role === "admin" || 
      (process.currentDepartmentId && departments?.find(d => d.id === process.currentDepartmentId)?.name === currentUser?.department);

    console.log(`Step ${sectorStep.name}: userCanEdit=${userCanEdit}, existingStep=${!!existingStep}, isCompleted=${isCompleted}`);

    return {
      ...sectorStep,
      id: existingStep?.id,
      isCompleted,
      userCanEdit,
      observations: existingStep?.observations || "",
    };
  });

  // Get workflow phases with completion status
  const getWorkflowPhases = () => {
    if (!steps) return [];

    const phaseGroups = steps.reduce((acc, step) => {
      if (!acc[step.phase]) {
        acc[step.phase] = [];
      }
      acc[step.phase].push(step);
      return acc;
    }, {} as Record<string, ProcessStep[]>);

    return Object.entries(phaseGroups).map(([phase, phaseSteps]) => {
      const completedSteps = phaseSteps.filter(step => step.isCompleted).length;
      const totalSteps = phaseSteps.length;
      const isPhaseCompleted = completedSteps === totalSteps && totalSteps > 0;
      const phaseDeadline = phaseDeadlines[phase as keyof typeof phaseDeadlines];

      return {
        name: phase,
        displayName: phaseDeadline?.name || phase,
        description: phaseDeadline?.description || "",
        deadline: phaseDeadline?.deadline,
        color: phaseDeadline?.color || "gray",
        steps: phaseSteps,
        completedSteps,
        totalSteps,
        isCompleted: isPhaseCompleted,
        isOverdue: phaseDeadline?.deadline && new Date() > phaseDeadline.deadline && !isPhaseCompleted,
      };
    });
  };

  const workflowPhases = getWorkflowPhases();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Processo {process.pbdocNumber}
          </h1>
          <p className="text-gray-600">{process.description}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={process.status} />
          <PriorityBadge priority={process.priority} />
        </div>
      </div>

      {/* Process Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Criado em</span>
            </div>
            <p className="font-medium">{new Date(process.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">Departamento Atual</span>
            </div>
            <p className="font-medium">
              {departmentMap[process.currentDepartmentId] || "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600">Última Atualização</span>
            </div>
            <p className="font-medium">{new Date(process.updatedAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="workflow">Fluxo de Trabalho</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Process Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Processo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Modalidade</Label>
                  <p className="text-sm text-gray-600">{process.modality?.name}</p>
                </div>
                <div>
                  <Label>Fonte de Recursos</Label>
                  <p className="text-sm text-gray-600">{process.source?.description}</p>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <p className="text-sm text-gray-600">{process.responsible?.username}</p>
                </div>
                <div>
                  <Label>Valor Estimado</Label>
                  <p className="text-sm text-gray-600">
                    R$ {process.estimatedValue?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progresso do Fluxo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowPhases.map((phase) => (
                    <div key={phase.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          phase.isCompleted ? 'bg-green-500' : 
                          phase.isOverdue ? 'bg-red-500' : 'bg-gray-300'
                        }`} />
                        <div>
                          <p className="font-medium">{phase.displayName}</p>
                          <p className="text-xs text-gray-500">
                            {phase.completedSteps}/{phase.totalSteps} etapas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {phase.deadline && (
                          <p className="text-xs text-gray-500">
                            {phase.deadline.toLocaleDateString()}
                          </p>
                        )}
                        {phase.isOverdue && (
                          <p className="text-xs text-red-500">Atrasado</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle>Fluxograma do Processo</CardTitle>
            </CardHeader>
            <CardContent>
              {process && (
                <BiddingFlowchart 
                  departmentName={currentUser?.department || ""} 
                  modalityId={process.modalityId}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Verificação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Use os botões abaixo para aprovar ou rejeitar cada etapa do
                  processo. Para rejeitar uma etapa, é obrigatório fornecer uma
                  explicação com pelo menos 100 caracteres.
                </p>
                {process && currentUser && (
                  <StepChecklist
                    processId={process.id}
                    modalityId={process.modalityId}
                    userDepartment={currentUser.department}
                    authorizationModalOpen={authorizationModalOpen}
                    setAuthorizationModalOpen={setAuthorizationModalOpen}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Responsabilidades</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <p>Carregando histórico...</p>
              ) : responsibilityHistory && responsibilityHistory.length > 0 ? (
                <div className="space-y-4">
                  {responsibilityHistory.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-blue-200 pl-4 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{departmentMap[entry.departmentId]}</h4>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.transferredAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Responsável: {entry.responsibleUser}
                      </p>
                      {entry.comments && (
                        <p className="text-sm text-gray-600 mt-2">
                          Comentários: {entry.comments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Nenhum histórico disponível.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="destructive"
          onClick={() => setDeleteModalOpen(true)}
          disabled={currentUser?.role !== "admin"}
        >
          <Trash className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </div>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" />
              Excluir Processo
            </DialogTitle>
            <DialogDescription>
              Esta ação moverá o processo para a lixeira. Informe o motivo da exclusão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deletion-reason">Motivo da Exclusão *</Label>
              <Textarea
                id="deletion-reason"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Descreva o motivo da exclusão (mínimo 10 caracteres)"
                rows={3}
                maxLength={500}
              />
              <div className="text-sm text-gray-500 mt-1">
                {deletionReason.length}/500 caracteres
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletionReason("");
                }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || deletionReason.trim().length < 10}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal removido - transferido para StepChecklist */}
    </div>
  );
};

export default ProcessDetail;