import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Process,
  BiddingModality,
  ResourceSource,
  User,
  ProcessStep,
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
  ArrowLeft,
  FileText,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getProcessStatusLabel,
  getProcessPriorityLabel,
} from "@/lib/utils/process";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ProcessDetailProps {
  id: string;
}

const ProcessDetail = ({ id }: ProcessDetailProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [stepToReject, setStepToReject] = useState<ProcessStep | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [allowForcedReturn, setAllowForcedReturn] = useState(false);
  const [isFlowchartExpanded, setIsFlowchartExpanded] = useState(false);
  const [isZoomFocused, setIsZoomFocused] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const flowchartRef = useRef<HTMLDivElement>(null);
  const parsedId = parseInt(id);

  // Função para obter a imagem específica do departamento
  const getFlowchartImage = (department: string | undefined) => {
    if (!department || !isZoomFocused) {
      return "/fluxograma-seap-1.png"; // Imagem completa
    }

    // Mapeamento de departamentos para imagens específicas
    const departmentImages = {
      "Setor Demandante": "/fluxograma-setor-demandante.png",
      "Divisão de Licitação": "/fluxograma-divisao-licitacao.png", 
      "Núcleo de Pesquisa de Preços – NPP": "/fluxograma-npp.png",
      "Procuradoria Geral do Estado - PGE": "/fluxograma-pge.png",
      "Unidade de Orçamento e Finanças": "/fluxograma-financeiro.png",
      "Secretário de Estado da Administração Penitenciária - SEAP": "/fluxograma-seap-secretario.png",
    };

    return departmentImages[department as keyof typeof departmentImages] || "/fluxograma-seap-1.png";
  };

  // Função simplificada - sem zoom, apenas usa imagens específicas
  const getFlowchartStyle = () => {
    return {}; // Sem transformações CSS necessárias
  };

  const getDepartmentFocus = (department: string | undefined) => {
    const focuses = {
      "Setor Demandante": "Iniciação",
      "Divisão de Licitação": "Preparação & Execução",
      "Núcleo de Pesquisa de Preços – NPP": "Pesquisa de Preços",
      "Procuradoria Geral do Estado - PGE": "Análise Jurídica",
      "Unidade de Orçamento e Finanças": "Análise Orçamentária",
      "Secretário de Estado da Administração Penitenciária - SEAP":
        "Autorização Final",
    };

    return focuses[department as keyof typeof focuses] || "Visão Geral";
  };

  const getDepartmentDescription = (department: string | undefined) => {
    const descriptions = {
      "Setor Demandante":
        "Responsável pela criação do DFD, ETP, Mapa de Risco e Termo de Referência. Esta é a fase inicial onde a necessidade é formalizada.",
      "Divisão de Licitação":
        "Coordena todo o processo licitatório, desde a criação até a execução. Gerencia prazos e documentação.",
      "Núcleo de Pesquisa de Preços – NPP":
        "Realiza pesquisa de mercado e análise de preços para garantir economicidade na contratação.",
      "Procuradoria Geral do Estado - PGE":
        "Analisa juridicamente todos os documentos e procedimentos para garantir conformidade legal.",
      "Unidade de Orçamento e Finanças":
        "Verifica disponibilidade orçamentária e autoriza empenho dos recursos necessários.",
      "Secretário de Estado da Administração Penitenciária - SEAP":
        "Autoridade máxima que aprova e autoriza o processo licitatório.",
    };

    return (
      descriptions[department as keyof typeof descriptions] ||
      "Visualização geral do processo de licitação."
    );
  };

  // Get process details
  const {
    data: process,
    isLoading: processLoading,
    error,
  } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
  });

  // Get modality details
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ["/api/modalities"],
    enabled: !!process,
  });

  // Get source details
  const { data: sources } = useQuery<ResourceSource[]>({
    queryKey: ["/api/sources"],
    enabled: !!process,
  });

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/status"],
  });

  // Get user details
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!process,
  });

  // Get current modality
  const modality =
    process && modalities
      ? modalities.find((m) => m.id === process.modalityId)
      : undefined;

  // Get source
  const source =
    process && sources
      ? sources.find((s) => s.id === process.sourceId)
      : undefined;

  // Get responsible user
  const responsible =
    process && users
      ? users.find((u) => u.id === process.responsibleId)
      : undefined;

  // Fetch process steps to get the next step
  const { data: steps } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${parsedId}/steps`],
    enabled: !!process,
  });

  // Auto-create steps if none exist - only run once per process
  useEffect(() => {
    if (process && steps !== undefined && steps.length === 0) {
      const defaultSteps = [
        "Demanda identificada pela unidade requisitante",
        "Encaminhamento da demanda ao setor de licitações",
        "Elaboração dos estudos técnicos preliminares",
        "Análise de viabilidade e adequação orçamentária",
        "Elaboração do termo de referência ou projeto básico",
        "Aprovação do termo de referência pela autoridade competente",
        "Designação do pregoeiro e equipe de apoio",
        "Elaboração do edital de licitação",
        "Análise jurídica do edital",
        "Aprovação do edital pela autoridade competente",
        "Publicação do aviso de licitação",
        "Disponibilização do edital aos interessados",
        "Período para envio de propostas",
        "Sessão pública do pregão eletrônico",
        "Análise e julgamento das propostas",
        "Fase de lances",
        "Análise da documentação do vencedor",
        "Adjudicação do objeto",
        "Homologação do resultado",
        "Assinatura do contrato ou emissão da ordem",
        "Publicação do extrato do contrato",
      ];

      // Create steps in a single batch to avoid race conditions
      const createSteps = async () => {
        try {
          const promises = defaultSteps.map((stepName) =>
            apiRequest("POST", `/api/processes/${parsedId}/steps`, {
              stepName,
              departmentId: process.currentDepartmentId,
              isCompleted: false,
            }),
          );

          await Promise.all(promises);

          // Refresh steps after creation
          queryClient.invalidateQueries({
            queryKey: [`/api/processes/${parsedId}/steps`],
          });

          toast({
            title: "Checklist criado",
            description:
              "As etapas do pregão eletrônico foram criadas automaticamente.",
          });
        } catch (error) {
          console.error("Erro ao criar etapas padrão:", error);
        }
      };

      createSteps();
    }
  }, [process?.id, steps?.length]); // More specific dependencies

  // Fetch departments for step details
  const { data: departments } = useQuery<any[]>({
    queryKey: ["/api/departments"],
    enabled: !!process,
  });

  // Find the next incomplete step
  const nextStep = steps?.find((step) => !step.isCompleted);
  const stepDepartment =
    nextStep && Array.isArray(departments)
      ? departments.find((d: any) => d.id === nextStep.departmentId)
      : undefined;

  // Get current department from process
  const currentDepartment =
    process && Array.isArray(departments)
      ? departments.find((d: any) => d.id === process.currentDepartmentId)
      : undefined;

  // Mapeamento de departamentos por ID - usando nomes exatos do banco
  const departmentIdMap: { [key: string]: number } = {
    TI: 1,
    "Setor Demandante": 1,
    Licitações: 2,
    "Núcleo de Pesquisa de Preços – NPP": 2,
    Jurídico: 3,
    "Setor Jurídico": 3,
    Financeiro: 4,
    "Unidade de Orçamento e Finanças": 4,
    Administrativo: 5,
    "Setor Administrativo": 5,
  };

  // Function to get sector-specific steps
  const getSectorSteps = (userDepartment: string, modalityId: number) => {
    // Funciona para todas as modalidades de pregão

    // Mapeamento dos nomes de departamentos do banco para os setores do fluxo
    const departmentToSectorMap: { [key: string]: string } = {
      "Setor Demandante": "TI",
      "Divisão de Licitação": "Licitações",
      Licitação: "Licitações", // Nome do departamento atual no banco
      "Núcleo de Pesquisa de Preços – NPP": "NPP",
      "Unidade de  Orçamento e  Finanças": "Financeiro",
      "Procuradoria Geral do Estado - PGE": "Jurídico",
      "Secretário de Estado da Administração  Penitenciária - SEAP":
        "Administrativo",
      Planejamento: "TI", // Mapeamento para o departamento atual do usuário admin
      TI: "TI",
      Licitações: "Licitações",
      Jurídico: "Jurídico",
      Financeiro: "Financeiro",
      Administrativo: "Administrativo",
    };

    const sector = departmentToSectorMap[userDepartment] || userDepartment;

    console.log("getSectorSteps - Input:", { userDepartment, modalityId });
    console.log("getSectorSteps - Mapped sector:", sector);

    const stepsBySector: {
      [key: string]: { name: string; phase: string; nextSector?: string }[];
    } = {
      // TI - Setor Demandante (Fase de Iniciação)
      TI: [
        {
          name: "Documento de Formalização da Demanda - DFD",
          phase: "Iniciação",
        },
        {
          name: "Estudo Técnico Preliminar - ETP",
          phase: "Iniciação",
        },
        {
          name: "Mapa de Risco - MR",
          phase: "Iniciação",
        },
        {
          name: "Termo de Referência - TR",
          phase: "Iniciação",
        },
      ],

      // Licitações - Divisão de Licitação
      Licitações: [
        {
          name: "Criar Processo - Órgão",
          phase: "Preparação",
        },
        {
          name: "Fazer Pesquisa de Preço - Órgão",
          phase: "Preparação",
        },
        {
          name: "Solicitar Pesquisa de Preços",
          phase: "Preparação",
        },
        {
          name: "Inserir Pesquisa no Sistema",
          phase: "Execução",
        },
        {
          name: "Solicitar Análise Orçamentária",
          phase: "Execução",
        },
        {
          name: "Solicitar Autorização ao O.D.",
          phase: "Execução",
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
        },
        {
          name: "Metodologia da Pesquisa de Preços",
          phase: "Preparação",
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
          name: "Aprovação do termo de referência pela autoridade competente",
          phase: "Iniciação",
          nextSector: "Licitações",
        },
        {
          name: "Aprovação do edital pela autoridade competente",
          phase: "Preparação",
          nextSector: "Licitações",
        },
        {
          name: "Adjudicação do objeto",
          phase: "Finalização",
          nextSector: "Administrativo",
        },
        {
          name: "Homologação do resultado",
          phase: "Finalização",
          nextSector: "Administrativo",
        },
        {
          name: "Empenho da despesa",
          phase: "Finalização",
          nextSector: "Administrativo",
        },
      ],

      // Administrativo - Gestão Contratual
      Administrativo: [
        {
          name: "Assinatura do contrato ou emissão da ordem",
          phase: "Finalização",
        },
        { name: "Publicação do extrato do contrato", phase: "Finalização" },
        {
          name: "Fiscalização e acompanhamento contratual",
          phase: "Finalização",
        },
      ],
    };

    const result = stepsBySector[sector] || [];
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
        description: "Publicação do edital até habilitação dos licitantes",
        deadline: new Date(createdDate.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 dias
        color: "orange",
      },
      Finalização: {
        name: "Fase de Finalização",
        description: "Adjudicação até assinatura do contrato",
        deadline: new Date(createdDate.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 dias
        color: "green",
      },
    };
  };

  // Get current phase based on user department
  const getCurrentPhase = (userDepartment: string) => {
    const phaseMap: { [key: string]: string } = {
      TI: "Iniciação",
      Licitações: "Preparação",
      Jurídico: "Preparação",
      Financeiro: "Iniciação",
      Administrativo: "Finalização",
    };
    return phaseMap[userDepartment] || "Iniciação";
  };

  // Handle edit process
  const handleEdit = () => {
    setLocation(`/processes/${id}/edit`);
  };

  // Handle step rejection
  const handleStepReject = async (step: ProcessStep) => {
    setStepToReject(step);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  // Submit step rejection
  const submitStepRejection = async () => {
    if (!stepToReject || rejectionReason.trim().length < 100) {
      toast({
        title: "Erro",
        description: "O motivo da rejeição deve ter pelo menos 100 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRejection(true);

    try {
      const response = await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepToReject.id}`,
        {
          isCompleted: false,
          observations: rejectionReason.trim(),
          rejectedAt: new Date().toISOString(),
        },
      );

      if (response.ok) {
        await queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}/steps`],
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}`],
        });

        toast({
          title: "Etapa rejeitada",
          description: "A etapa foi rejeitada com sucesso.",
        });

        setRejectModalOpen(false);
        setStepToReject(null);
        setRejectionReason("");
      } else {
        throw new Error("Erro ao rejeitar etapa");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a etapa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Handle step toggle
  const handleStepToggle = async (stepId: number, isCompleted: boolean) => {
    try {
      console.log(
        `Atualizando etapa ${stepId} para isCompleted: ${isCompleted}`,
      );

      const step = steps?.find((s) => s.id === stepId);
      if (!step) return;

      const response = await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepId}`,
        {
          isCompleted,
        },
      );

      if (response.ok) {
        console.log("Etapa atualizada com sucesso");

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}/steps`],
        });

        toast({
          title: isCompleted ? "Etapa concluída" : "Etapa desmarcada",
          description: isCompleted
            ? "A etapa foi marcada como concluída."
            : "A etapa foi desmarcada.",
        });
      } else {
        console.error("Erro na resposta:", response.status);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a etapa.",
        variant: "destructive",
      });
    }
  };

  // Handle delete process
  const handleDelete = async () => {
    try {
      await apiRequest("DELETE", `/api/processes/${parsedId}`, undefined);

      // Show success toast
      toast({
        title: "Processo excluído",
        description: "O processo foi excluído com sucesso",
      });

      // Redirect to processes list
      setLocation("/processes");

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
    } catch (error) {
      console.error("Delete error:", error);

      // Show error toast
      toast({
        title: "Erro ao excluir processo",
        description: "Não foi possível excluir o processo",
        variant: "destructive",
      });
    }
  };

  // Handle status icon
  const getStatusIcon = () => {
    if (!process) return null;

    switch (process.status) {
      case "draft":
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
      case "in_progress":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "canceled":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  // Flowchart functions
  const toggleFlowchartView = () => {
    setIsFlowchartExpanded(!isFlowchartExpanded);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFlowchartExpanded) {
        setIsFlowchartExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isFlowchartExpanded]);

  if (processLoading) {
    return (
      <div className="p-8 text-center">Carregando detalhes do processo...</div>
    );
  }

  if (error || !process) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Erro ao carregar processo
        </h2>
        <p>Não foi possível carregar os detalhes do processo.</p>
        <Button onClick={() => setLocation("/processes")} className="mt-4">
          Voltar para Processos
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          {getStatusIcon()}
          <div className="ml-2">
            <h1 className="text-2xl font-semibold text-gray-800">
              Processo {process.pbdocNumber}
            </h1>
            <p className="text-gray-600">{process.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={() => setLocation(`/processes/${process.id}/report`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>

          <Button
            variant="outline"
            onClick={() => setLocation(`/processes/${process.id}/transfer`)}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Tramitar
          </Button>

          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este processo? Esta ação não
                  pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>

          <TabsTrigger value="flow">Fluxo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        PBDOC
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {process.pbdocNumber}
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Descrição
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {process.description}
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Modalidade
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {modality?.name || `Modalidade ${process.modalityId}`}
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Fonte
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {source
                          ? `Fonte ${source.code} - ${source.description}`
                          : `Fonte ${process.sourceId}`}
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Responsável
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        <div className="text-xs text-gray-500">
                          {responsible?.fullName ||
                            `Usuário ${process.responsibleId}`}
                          {process.responsibleSince && (
                            <div className="mt-1 text-xs text-blue-600 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Responsável desde{" "}
                              {format(
                                new Date(process.responsibleSince),
                                "dd/MM/yyyy",
                                { locale: ptBR },
                              )}
                              (
                              {Math.ceil(
                                (new Date().getTime() -
                                  new Date(
                                    process.responsibleSince,
                                  ).getTime()) /
                                  (1000 * 60 * 60 * 24),
                              )}{" "}
                              dias)
                            </div>
                          )}
                        </div>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status e Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Status
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        <span
                          className={`status-badge status-badge-${process.status}`}
                        >
                          {getProcessStatusLabel(process.status)}
                        </span>
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Prioridade
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        <span
                          className={`priority-badge priority-badge-${process.priority}`}
                        >
                          {getProcessPriorityLabel(process.priority)}
                        </span>
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Data de Criação
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {format(
                          new Date(process.createdAt),
                          "dd 'de' MMMM 'de' yyyy",
                          { locale: ptBR },
                        )}
                      </dd>
                    </div>

                    <div className="py-3 grid grid-cols-3">
                      <dt className="text-sm font-medium text-gray-500">
                        Última Atualização
                      </dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {format(
                          new Date(process.updatedAt),
                          "dd 'de' MMMM 'de' yyyy",
                          { locale: ptBR },
                        )}
                      </dd>
                    </div>

                    {process.deadline && (
                      <div className="py-3 grid grid-cols-3">
                        <dt className="text-sm font-medium text-gray-500">
                          Prazo de Entrega
                        </dt>
                        <dd className="text-sm text-gray-900 col-span-2 flex items-center">
                          {format(
                            new Date(process.deadline),
                            "dd 'de' MMMM 'de' yyyy",
                            { locale: ptBR },
                          )}
                          {new Date(process.deadline) < new Date() ? (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              Atrasado
                            </span>
                          ) : (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              {Math.ceil(
                                (new Date(process.deadline).getTime() -
                                  new Date().getTime()) /
                                  (1000 * 60 * 60 * 24),
                              )}{" "}
                              dias restantes
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar with Checklist */}
            <div className="space-y-6">
              {/* Next Step Card */}
              {nextStep && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Clock className="h-5 w-5 mr-2 text-blue-600" />
                      Próxima Etapa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {nextStep.stepName}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Setor Responsável:{" "}
                          {currentDepartment?.name ||
                            "Departamento não definido"}
                        </p>
                      </div>

                      {nextStep.dueDate && (
                        <div className="flex items-center text-xs text-orange-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(nextStep.dueDate), "dd/MM/yyyy")}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Progresso:{" "}
                          {steps?.filter((s) => s.isCompleted).length || 0} de{" "}
                          {steps?.length || 0}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{
                              width: `${((steps?.filter((s) => s.isCompleted).length || 0) / (steps?.length || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Sector-Specific Checklist */}
                      {currentUser && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Checklist do Setor{" "}
                            {currentDepartment?.name || "Atual"}
                          </h4>

                          {/* Sector Steps */}
                          <div className="space-y-2">
                            {(() => {
                              const sectorSteps = getSectorSteps(
                                currentDepartment?.name ||
                                  currentUser.department,
                                process?.modalityId || 1,
                              );
                              console.log("Sector steps:", sectorSteps);
                              console.log(
                                "Current department:",
                                currentDepartment?.name,
                              );
                              console.log(
                                "Current user department:",
                                currentUser.department,
                              );
                              console.log(
                                "Process current department ID:",
                                process?.currentDepartmentId,
                              );
                              return sectorSteps;
                            })()
                              .filter((sectorStep) => {
                                // Mostrar apenas etapas pendentes (não concluídas)
                                const existingStep = steps?.find(
                                  (s) => s.stepName === sectorStep.name,
                                );
                                return !existingStep?.isCompleted;
                              })
                              .map((sectorStep, index) => {
                                const existingStep = steps?.find(
                                  (s) => s.stepName === sectorStep.name,
                                );
                                const isCompleted =
                                  existingStep?.isCompleted || false;

                                // Só mostrar se o usuário atual pertence ao departamento do processo
                                const userCanEdit =
                                  currentUser.department ===
                                    currentDepartment?.name ||
                                  currentUser.role === "admin";

                                console.log(
                                  `Step ${sectorStep.name}: userCanEdit=${userCanEdit}, existingStep=${!!existingStep}, isCompleted=${isCompleted}`,
                                );

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center space-x-3 p-3 bg-white rounded border border-gray-200"
                                  >
                                    <div className="flex items-center space-x-2">
                                      {/* Botão de Aprovar */}
                                      <button
                                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                          isCompleted
                                            ? "bg-green-600 border-green-600 hover:bg-green-700"
                                            : userCanEdit
                                              ? "border-green-400 hover:border-green-600 bg-white hover:bg-green-50"
                                              : "border-gray-300 bg-gray-100"
                                        }`}
                                        onClick={async () => {
                                          if (!userCanEdit) return;

                                          if (existingStep) {
                                            // Etapa existe, apenas atualizar
                                            handleStepToggle(
                                              existingStep.id,
                                              !isCompleted,
                                            );
                                          } else {
                                            // Etapa não existe, criar primeiro
                                            try {
                                              const response = await apiRequest(
                                                "POST",
                                                `/api/processes/${process.id}/steps`,
                                                {
                                                  stepName: sectorStep.name,
                                                  departmentId:
                                                    process.currentDepartmentId,
                                                  isCompleted: true,
                                                  observations: null,
                                                },
                                              );

                                              if (response.ok) {
                                                // Recarregar etapas
                                                queryClient.invalidateQueries({
                                                  queryKey: [
                                                    `/api/processes/${process.id}/steps`,
                                                  ],
                                                });

                                                toast({
                                                  title:
                                                    "Etapa criada e concluída",
                                                  description: `Etapa "${sectorStep.name}" foi criada e marcada como concluída`,
                                                });
                                              }
                                            } catch (error) {
                                              toast({
                                                title: "Erro",
                                                description:
                                                  "Não foi possível criar a etapa",
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}
                                        disabled={!userCanEdit}
                                        title="Aprovar etapa"
                                      >
                                        {isCompleted ? (
                                          <Check className="h-4 w-4 text-white" />
                                        ) : (
                                          <Check className="h-4 w-4 text-green-600" />
                                        )}
                                      </button>

                                      {/* Botão de Rejeitar */}
                                      <button
                                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                          userCanEdit
                                            ? "border-red-400 hover:border-red-600 bg-white hover:bg-red-50"
                                            : "border-gray-300 bg-gray-100"
                                        }`}
                                        onClick={async () => {
                                          if (!userCanEdit) return;

                                          if (existingStep) {
                                            // Etapa existe, apenas rejeitar
                                            handleStepReject(existingStep);
                                          } else {
                                            // Etapa não existe, criar primeiro para poder rejeitar
                                            try {
                                              const response = await apiRequest(
                                                "POST",
                                                `/api/processes/${process.id}/steps`,
                                                {
                                                  stepName: sectorStep.name,
                                                  departmentId:
                                                    process.currentDepartmentId,
                                                  isCompleted: false,
                                                  observations: null,
                                                },
                                              );

                                              if (response.ok) {
                                                const newStep =
                                                  await response.json();
                                                // Rejeitar a etapa criada
                                                handleStepReject(newStep);
                                              }
                                            } catch (error) {
                                              toast({
                                                title: "Erro",
                                                description:
                                                  "Não foi possível criar a etapa para rejeição",
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}
                                        disabled={!userCanEdit}
                                        title="Rejeitar etapa"
                                      >
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      </button>
                                    </div>

                                    <div className="flex-1">
                                      <p
                                        className={`text-sm font-medium ${isCompleted ? "line-through text-gray-500" : "text-gray-900"}`}
                                      >
                                        {sectorStep.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Fase: {sectorStep.phase}
                                      </p>
                                      {existingStep?.observations && (
                                        <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                                          <strong>Motivo da rejeição:</strong>{" "}
                                          {existingStep.observations}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Current Step Action */}
                      {/* {nextStep && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Ação da Etapa Atual
                          </h4>
                          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <button
                              className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                nextStep.isCompleted 
                                  ? "bg-green-600 border-green-600 hover:bg-green-700" 
                                  : "border-blue-400 hover:border-green-400 bg-white hover:bg-green-50"
                              }`}
                              onClick={() => handleStepToggle(nextStep.id, !nextStep.isCompleted)}
                            >
                              {nextStep.isCompleted ? (
                                <CheckCircle className="h-4 w-4 text-white" />
                              ) : (
                                <span className="text-sm text-blue-600 font-medium">✓</span>
                              )}
                            </button>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${nextStep.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {nextStep.stepName}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {nextStep.isCompleted ? 'Etapa concluída' : 'Clique para marcar como concluída'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
       /*}
       {/* Botão de Correção do Checklist */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <center>
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              try {
                                // Corrigir apenas etapas do setor atual
                                if (steps && currentDepartment) {
                                  const sectorSteps = getSectorSteps(
                                    currentDepartment.name,
                                    process?.modalityId || 1,
                                  );

                                  // Filtrar apenas etapas do setor atual que estão concluídas
                                  const currentSectorSteps = steps.filter(
                                    (step) =>
                                      sectorSteps.some(
                                        (sectorStep) =>
                                          sectorStep.name === step.stepName,
                                      ) && step.isCompleted,
                                  );

                                  for (const step of currentSectorSteps) {
                                    await apiRequest(
                                      "PATCH",
                                      `/api/processes/${parsedId}/steps/${step.id}`,
                                      { isCompleted: false },
                                    );
                                  }

                                  queryClient.invalidateQueries({
                                    queryKey: [
                                      `/api/processes/${parsedId}/steps`,
                                    ],
                                  });

                                  toast({
                                    title: "Checklist corrigido",
                                    description: `Etapas do setor ${currentDepartment.name} foram desmarcadas.`,
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Erro",
                                  description:
                                    "Não foi possível corrigir o checklist.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Corrigir
                          </Button>
                          <p className="text-sm text-gray-600 mt-2">
                            Remove apenas as marcações do setor atual feitas
                            incorretamente
                          </p>
                        </center>
                      </div>
                      {/* Prazo de Finalização por Fase */}
                      {currentUser && process && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-orange-600" />
                            Prazos de Finalização - Fluxograma Oficial
                          </h4>

                          {(() => {
                            const currentPhase = getCurrentPhase(
                              currentUser.department,
                            );
                            const phaseDeadlines = getPhaseDeadlines(
                              new Date(process.createdAt),
                            );
                            const currentPhaseInfo =
                              phaseDeadlines[
                                currentPhase as keyof typeof phaseDeadlines
                              ];

                            if (!currentPhaseInfo) return null;

                            const daysRemaining = Math.ceil(
                              (currentPhaseInfo.deadline.getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24),
                            );
                            const isOverdue = daysRemaining < 0;
                            const isUrgent =
                              daysRemaining <= 3 && daysRemaining >= 0;

                            return (
                              <div
                                className={`p-3 rounded-lg border-2 ${
                                  isOverdue
                                    ? "bg-red-50 border-red-200"
                                    : isUrgent
                                      ? "bg-yellow-50 border-yellow-200"
                                      : "bg-green-50 border-green-200"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5
                                    className={`font-medium text-sm ${
                                      isOverdue
                                        ? "text-red-800"
                                        : isUrgent
                                          ? "text-yellow-800"
                                          : "text-green-800"
                                    }`}
                                  >
                                    {currentPhaseInfo.name}
                                  </h5>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      isOverdue
                                        ? "bg-red-200 text-red-800"
                                        : isUrgent
                                          ? "bg-yellow-200 text-yellow-800"
                                          : "bg-green-200 text-green-800"
                                    }`}
                                  >
                                    {isOverdue
                                      ? `${Math.abs(daysRemaining)} dias em atraso`
                                      : daysRemaining === 0
                                        ? "Vence hoje"
                                        : `${daysRemaining} dias restantes`}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">
                                  {currentPhaseInfo.description}
                                </p>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Prazo final:{" "}
                                  {format(
                                    currentPhaseInfo.deadline,
                                    "dd/MM/yyyy",
                                    { locale: ptBR },
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Resumo de todas as fases */}
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {process &&
                              Object.entries(
                                getPhaseDeadlines(new Date(process.createdAt)),
                              ).map(([phase, info]) => {
                                const daysFromStart = Math.ceil(
                                  (info.deadline.getTime() -
                                    new Date(process.createdAt).getTime()) /
                                    (1000 * 60 * 60 * 24),
                                );
                                const isPast = new Date() > info.deadline;

                                return (
                                  <div
                                    key={phase}
                                    className={`p-2 rounded text-xs border ${
                                      isPast
                                        ? "bg-gray-100 border-gray-300 text-gray-500"
                                        : "bg-white border-gray-200"
                                    }`}
                                  >
                                    <div className="font-medium">
                                      {info.name}
                                    </div>
                                    <div className="text-gray-500">
                                      {daysFromStart} dias
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checklist">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Checklist de Aprovação/Rejeição de Etapas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Use os botões abaixo para aprovar ou rejeitar cada etapa do
                  processo. Para rejeitar uma etapa, é obrigatório fornecer uma
                  explicação com pelo menos 100 caracteres.
                </p>
                {process && currentUser && (
                  <StepChecklist
                    processId={process.id}
                    modalityId={process.modalityId}
                    userDepartment={currentUser.department}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flow">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Fluxograma do Pregão Eletrônico - SEAP/PB
              </h2>
              <p className="text-gray-600">
                Baseado na Lei nº 14.133/2021 - Nova Lei de Licitações e
                Contratos
              </p>
            </div>

            {/* Fluxograma Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Fluxograma Visual do Processo</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isZoomFocused) {
                          setIsFullScreen(true);
                        } else {
                          setIsZoomFocused(true);
                        }
                      }}
                    >
                      {isZoomFocused ? "Visão Completa" : "Foco no Setor"}
                    </Button>

                    <div className="text-sm text-gray-600">
                      Foco: {currentUser?.department || "Geral"}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white overflow-hidden">
                  <div className="relative">
                    <img
                      src={getFlowchartImage(currentUser?.department)}
                      alt="Fluxograma do Processo de Licitação SEAP"
                      className="w-full h-auto transition-all duration-500 hover:scale-105"
                      style={getFlowchartStyle()}
                    />
                    <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {getDepartmentFocus(currentUser?.department)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    {isZoomFocused ? `Foco: ${currentUser?.department}` : "Fluxograma Completo"}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {isZoomFocused 
                      ? `Visualizando imagem específica do ${currentUser?.department}. ${getDepartmentDescription(currentUser?.department)}`
                      : "Visualizando todo o fluxograma do processo de licitação."
                    }
                  </p>
                  {isZoomFocused && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                      💡 Para ver as imagens específicas de cada setor, você pode enviar as imagens cortadas com os nomes: 
                      fluxograma-setor-demandante.png, fluxograma-divisao-licitacao.png, etc.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fase 1: Iniciação */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                FASE DE INICIAÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-blue-300">
                  <h4 className="font-medium text-gray-800">
                    Setor Demandante
                  </h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Documento de Formalização da Demanda (DFD)</li>
                    <li>• Estudo Técnico Preliminar (ETP)</li>
                    <li>• Mapa de Risco (MR)</li>
                    <li>• Termo de Referência (TR)</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-orange-300">
                  <h4 className="font-medium text-gray-800">
                    Ordenador de Despesa
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Autorização (Prazo: 10 dias)
                  </p>
                </div>
              </div>
            </div>

            {/* Fase 2: Preparação */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                FASE DE PREPARAÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-yellow-300">
                  <h4 className="font-medium text-gray-800">
                    Divisão de Licitação
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Criar Processo no Órgão (Prazo: 2 dias)
                  </p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-green-300">
                  <h4 className="font-medium text-gray-800">
                    Núcleo de Pesquisa de Preços
                  </h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Fazer Pesquisa de Preços (Prazo: 2 dias)</li>
                    <li>• Elaborar Mapa Comparativo (Prazo: 10 dias)</li>
                    <li>• Metodologia da Pesquisa (Prazo: 10 dias)</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-purple-300">
                  <h4 className="font-medium text-gray-800">
                    Orçamento e Finanças
                  </h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>
                      • Consultar Disponibilidade Orçamentária (Prazo: 1 dia)
                    </li>
                    <li>• Emitir Reserva Orçamentária (Prazo: 1 dia)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fase 3: Execução */}
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                FASE DE EXECUÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-red-300">
                  <h4 className="font-medium text-gray-800">Secretário SEAP</h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Autorização Final
                  </p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-green-300">
                  <h4 className="font-medium text-gray-800">
                    Divisão de Licitação
                  </h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Elaborar Edital e Anexos (Prazo: 10 dias)</li>
                    <li>• Consultar Comitê Gestor (Prazo: 2 dias)</li>
                    <li>• Publicar Edital</li>
                    <li>• Realizar Sessão Pública de Lances</li>
                    <li>• Análise de Documentação</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-blue-300">
                  <h4 className="font-medium text-gray-800">
                    Assessoria Jurídica
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Elaboração de Nota Técnica (Prazo: 1 dia)
                  </p>
                </div>
              </div>
            </div>

            {/* Fase 4: Finalização */}
            <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  4
                </span>
                FASE DE FINALIZAÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-purple-300">
                  <h4 className="font-medium text-gray-800">
                    Divisão de Licitação
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Adjudicação e Homologação
                  </p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-blue-300">
                  <h4 className="font-medium text-gray-800">
                    Assessoria Jurídica
                  </h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Elaboração do Contrato
                  </p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-red-300">
                  <h4 className="font-medium text-gray-800">Secretário SEAP</h4>
                  <p className="text-sm text-gray-600 mt-2">
                    • Assinatura do Contrato
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-800 mb-2">
                Observações Importantes:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • Este fluxograma segue rigorosamente a Lei nº 14.133/2021
                </li>
                <li>
                  • Os prazos indicados são obrigatórios conforme legislação
                </li>
                <li>
                  • Cada fase deve ser concluída antes do início da próxima
                </li>
                <li>
                  • A documentação de cada etapa deve ser arquivada no processo
                </li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Rejeição */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rejeitar Etapa
            </DialogTitle>
            <DialogDescription>
              {stepToReject && (
                <>
                  Você está rejeitando a etapa:{" "}
                  <strong>{stepToReject.stepName}</strong>
                  <br />É obrigatório fornecer um motivo detalhado com pelo
                  menos 100 caracteres.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="rejection-reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Motivo da Rejeição *
              </label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Descreva detalhadamente o motivo da rejeição desta etapa..."
                className="min-h-[120px]"
                disabled={isSubmittingRejection}
              />
              <div
                className={`text-xs mt-1 ${rejectionReason.length < 100 ? "text-red-600" : "text-green-600"}`}
              >
                {rejectionReason.length}/100 caracteres (mínimo 100)
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={isSubmittingRejection}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitStepRejection}
              disabled={
                rejectionReason.trim().length < 100 || isSubmittingRejection
              }
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmittingRejection ? "Rejeitando..." : "Rejeitar Etapa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Tela Cheia para Fluxograma */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Fluxograma Completo - SEAP/PB</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsZoomFocused(!isZoomFocused)}
                >
                  {isZoomFocused ? "Foco no Setor" : "Visão Completa"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullScreen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={isZoomFocused ? getFlowchartImage(currentUser?.department) : "/fluxograma-completo.png"}
                  alt="Fluxograma do Processo de Licitação SEAP"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                {isZoomFocused 
                  ? `Visualizando imagem específica: ${currentUser?.department}`
                  : "Visualizando fluxograma completo do processo de licitação"
                }
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessDetail;
