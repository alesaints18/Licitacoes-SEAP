import { useState, useEffect, useRef } from "react";
import SimpleImageZoom from "@/components/SimpleImageZoom";
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
  Archive,
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [authorizationModalOpen, setAuthorizationModalOpen] = useState(false);
  const [authorizationDecision, setAuthorizationDecision] = useState("");
  const [stepForAuthorization, setStepForAuthorization] =
    useState<ProcessStep | null>(null);
  const [authorizationRejectionModalOpen, setAuthorizationRejectionModalOpen] =
    useState(false);
  const [authorizationRejectionDecision, setAuthorizationRejectionDecision] =
    useState("");
  const [stepForAuthorizationRejection, setStepForAuthorizationRejection] =
    useState<ProcessStep | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [stepToReject, setStepToReject] = useState<ProcessStep | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  // Estados para modal de correção ou cancelamento
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionDecision, setCorrectionDecision] = useState("");
  const [stepForCorrection, setStepForCorrection] =
    useState<ProcessStep | null>(null);

  // Estado para o modal de arquivamento
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [stepForArchive, setStepForArchive] = useState<ProcessStep | null>(null);

  // Estado para o modal de reavaliação SUBCC
  const [subccRevaluationModalOpen, setSubccRevaluationModalOpen] = useState(false);
  const [stepForSubccRevaluation, setStepForSubccRevaluation] = useState<ProcessStep | null>(null);

  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [allowForcedReturn, setAllowForcedReturn] = useState(false);
  const [isFlowchartExpanded, setIsFlowchartExpanded] = useState(false);
  const [isZoomFocused, setIsZoomFocused] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenViewMode, setFullScreenViewMode] = useState<
    "focused" | "complete"
  >("complete");

  const flowchartRef = useRef<HTMLDivElement>(null);
  const fullScreenImageRef = useRef<HTMLImageElement>(null);
  const parsedId = parseInt(id);

  // Função para obter a imagem específica do departamento
  const getFlowchartImage = (department: string | undefined) => {
    if (!department) {
      return "/fluxograma_seap_min.png"; // Imagem completa reduzida
    }

    // Mapeamento de departamentos para imagens específicas
    const departmentImages = {
      "Setor Demandante": "/fluxograma-setor-demandante_1752443886669.png",
      "Divisão de Licitação":
        "/fluxograma-divisão-de-licitação_1752443886668.png",
      "Núcleo de Pesquisa de Preços – NPP":
        "/fluxograma-nucleo-de-pesquisa-de-precos-npp_1752443886668.png",
      "Procuradoria Geral do Estado - PGE":
        "/fluxograma-procuradoria-geral-do-estado-pge_1752443886669.png",
      "Unidade de Orçamento e Finanças":
        "/fluxograma-unidade-de-orcamento-e-financas_1752443886670.png",
      "Secretário de Estado da Administração Penitenciária - SEAP":
        "/fluxograma-secretario-de-estado-da-administracao-penitenciaria-seap_1752443886669.png",
      "Equipe de Pregão": "/fluxograma-equipe-de-pregao_1752443886668.png",
      "Controladoria Geral do Estado – CGE":
        "/fluxograma-controladoria-geral-do-estado-cge_1752443886667.png",
      "Comitê Gestor do Plano de Contingência - CGPC":
        "/fluxograma-comite-gestor-do-plano-de-contigencia-cgpc_1752443886667.png",
      "Unidade Técnico Normativa":
        "/fluxograma-unidade-tecnico-normativa_1752443886665.png",
      "Subgerência de Contratos e  Convênios - SUBCC":
        "/fluxograma-subgerencia-de-contratos-e-convenios-SUBCC_1752443886670.png",
    };

    return (
      departmentImages[department as keyof typeof departmentImages] ||
      "/fluxograma_seap_min.png"
    );
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
      "Equipe de Pregão": "Condução de Sessões",
      "Controladoria Geral do Estado – CGE": "Controle e Auditoria",
      "Comitê Gestor do Plano de Contingência - CGPC":
        "Análise de Contingência",
      "Unidade Técnico Normativa": "Normas Técnicas",
      "Subgerência de Contratos e  Convênios - SUBCC": "Gestão de Contratos",
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
      "Equipe de Pregão":
        "Equipe especializada responsável pela condução das sessões de pregão eletrônico e presencial.",
      "Controladoria Geral do Estado – CGE":
        "Órgão de controle interno responsável pela fiscalização e auditoria dos processos licitatórios.",
      "Comitê Gestor do Plano de Contingência - CGPC":
        "Comitê responsável pela análise e autorização de processos em situações de contingência ou emergência.",
      "Unidade Técnico Normativa":
        "Setor responsável pela elaboração e atualização de normas técnicas e procedimentos operacionais.",
      "Subgerência de Contratos e  Convênios - SUBCC":
        "Unidade especializada no acompanhamento e gestão de contratos e convênios firmados.",
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

  // Get process responsibility history
  const { data: responsibilityHistory, isLoading: historyLoading } = useQuery<
    any[]
  >({
    queryKey: [`/api/processes/${parsedId}/responsibility-history`],
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
      "Unidade de Orçamento e Finanças": "Financeiro",
      "Procuradoria Geral do Estado - PGE": "Jurídico",
      "Secretário de Estado da Administração Penitenciária - SEAP":
        "Administrativo",
      "Subgerência de Contratos e  Convênios - SUBCC": "SUBCC",
      Planejamento: "TI", // Mapeamento para o departamento atual do usuário admin
      TI: "TI",
      Licitações: "Licitações",
      Jurídico: "Jurídico",
      Financeiro: "Financeiro",
      Administrativo: "Administrativo",
      SUBCC: "SUBCC",
    };

    const sector = departmentToSectorMap[userDepartment] || userDepartment;

    console.log("getSectorSteps - Input:", { userDepartment, modalityId });
    console.log("getSectorSteps - Mapped sector:", sector);

    // Verificar se NPP completou suas etapas principais
    const isNPPCompleted = () => {
      const nppSteps = ["Pesquisa de Preços", "Mapa Comparativo de Preços"];

      return nppSteps.every((stepName) => {
        const step = steps?.find((s) => s.stepName === stepName);
        return step?.isCompleted;
      });
    };

    const stepsBySector: {
      [key: string]: { name: string; phase: string; nextSector?: string }[];
    } = {
      // TI - Setor Demandante (Fase de Iniciação)
      TI: (() => {
        // Verificar se o processo está no Setor Demandante e tem etapa de correção completada com "Arquivar processo"
        const correctionStep = steps?.find(
          (s) =>
            s.stepName === "Devolver para correção ou cancelar processo" &&
            s.observations?.includes("Decisão: Arquivar processo") &&
            s.isCompleted === true,
        );

        // Verificar se a etapa "Arquivar processo" foi concluída no Setor Demandante
        const archiveStepCompleted = steps?.find(
          (s) =>
            s.stepName === "Arquivar processo" &&
            s.isCompleted === true,
        );

        // Se a etapa de arquivamento foi concluída, não mostrar mais nenhuma etapa no Setor Demandante
        if (process?.currentDepartmentId === 1 && archiveStepCompleted) {
          console.log(
            "🔍 SETOR DEMANDANTE - Etapa de arquivamento concluída, não exibindo etapas (processo arquivado)",
          );
          return [];
        }

        // Se processo está no Setor Demandante E tem decisão de arquivamento (mas arquivamento ainda não concluído)
        if (process?.currentDepartmentId === 1 && correctionStep) {
          console.log(
            "🔍 SETOR DEMANDANTE - Processo veio de decisão de arquivamento, mostrando apenas etapa de arquivamento",
          );
          return [
            {
              name: "Arquivar processo",
              phase: "Arquivamento",
            },
          ];
        }

        // Caso contrário, mostrar etapas normais do Setor Demandante
        return [
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
        ];
      })(),

      // Licitações - Divisão de Licitação (com lógica condicional simplificada)
      Licitações: (() => {
        // PRIORIDADE 1: Verificar se existe etapa "Arquivar processo - Final"
        const archiveFinalStep = steps?.find(
          (s) => s.stepName === "Arquivar processo - Final" && s.departmentId === 2
        );

        if (archiveFinalStep) {
          if (archiveFinalStep.isCompleted) {
            console.log("🔍 DIVISÃO LICITAÇÃO - Processo arquivado, sem etapas");
            return [];
          } else {
            console.log("🔍 DIVISÃO LICITAÇÃO - Mostrando etapa de arquivamento final");
            return [{ name: "Arquivar processo - Final", phase: "Arquivamento" }];
          }
        }

        // PRIORIDADE 2: Verificar se vem do fluxo de arquivamento do Setor Demandante
        const archiveFromDemandante = steps?.find(
          (s) => s.stepName === "Arquivar processo" && s.departmentId === 1 && s.isCompleted === true
        );

        if (archiveFromDemandante && process?.currentDepartmentId === 2) {
          console.log("🔍 DIVISÃO LICITAÇÃO - Criando etapa de arquivamento final");
          return [{ name: "Arquivar processo - Final", phase: "Arquivamento" }];
        }

        // PRIORIDADE 3: Verificar se vem do fluxo de correção (autorização rejeitada)
        const authorizationRejected = steps?.find(
          (s) => s.stepName === "Autorização pelo Secretário SEAP" && 
                 s.rejectionStatus === "Não autorizar a defesa ou solicitar reformulação da demanda" && 
                 s.isCompleted === true
        );

        if (authorizationRejected && process?.currentDepartmentId === 2) {
          // Verificar qual etapa de correção mostrar
          const correctionStep = steps?.find(
            (s) => s.stepName === "Devolver para correção ou cancelar processo" && s.departmentId === 2
          );
          
          console.log("🔍 DIVISÃO LICITAÇÃO - Fluxo de correção ativo");
          return [{ name: "Devolver para correção ou cancelar processo", phase: "Correção" }];
        }

        // PADRÃO: Fluxo normal da Divisão de Licitação
        console.log("🔍 DIVISÃO LICITAÇÃO - Fluxo normal");
        return [
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
          // Estas etapas só aparecem após NPP completar
          ...(isNPPCompleted()
            ? [
                {
                  name: "Inserir Pesquisa no Sistema",
                  phase: "Execução",
                },
                {
                  name: "Solicitar Análise Orçamentária",
                  phase: "Execução",
                },
              ]
            : []),
        ];
      })(),

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
          name: "Informar Disponibilidade Orçamentária p/ Emissão de R.O.",
          phase: "Execução",
          nextSector: "Administrativo",
        },
      ],

      // Administrativo - Secretário SEAP
      Administrativo: (() => {
        console.log("🔥 ADMINISTRATIVO - Iniciando lógica do setor");
        const baseSteps = [
          {
            name: "Autorização pelo Secretário SEAP",
            phase: "Autorização",
          },
        ];

        // Verificar se a autorização foi rejeitada com "Não autorizar a defesa ou solicitar reformulação da demanda"
        const authStep = steps?.find(
          (s) => s.stepName === "Autorização pelo Secretário SEAP",
        );
        
        console.log("🔥 ADMINISTRATIVO - AuthStep encontrado:", {
          found: !!authStep,
          isCompleted: authStep?.isCompleted,
          rejectionStatus: authStep?.rejectionStatus
        });
        
        const isRejectedForCorrection = authStep?.isCompleted && 
          authStep?.rejectionStatus === "Não autorizar a defesa ou solicitar reformulação da demanda";

        // REMOVIDO: Não criar automaticamente aqui para evitar duplicação
        // A etapa será criada/tornada visível apenas quando necessário no modal de rejeição
        
        console.log("🔥 ADMINISTRATIVO - Steps finais:", baseSteps.map(s => s.name));
        
        // Debug: Verificar se a etapa condicional deve aparecer
        if (isRejectedForCorrection) {
          console.log("🔥 ADMINISTRATIVO - Condição de rejeição atendida, etapa condicional deve ser tratada pelo modal de autorização");
        }

        // Verificar se a autorização foi aprovada com "Disponibilidade Orçamentária"
        const isAuthorizedWithBudget =
          authStep?.isCompleted &&
          authStep?.observations?.includes("Disponibilidade Orçamentária");

        // Verificar se a autorização foi CONFIRMADA com indisponibilidade orçamentária
        const isAuthorizedWithoutBudget =
          authStep?.isCompleted &&
          authStep?.observations &&
          (authStep.observations.includes(
            "Indisponibilidade Orçamentária Total",
          ) ||
            authStep.observations.includes(
              "Indisponibilidade Orçamentária Parcial",
            ) ||
            authStep.observations.includes(
              "Indisponibilidade Orçamentária total ou parcial",
            ) ||
            authStep.observations.includes(
              "Autorização: Indisponibilidade Orçamentária Total",
            ) ||
            authStep.observations.includes(
              "Autorização: Indisponibilidade Orçamentária Parcial",
            ) ||
            authStep.observations.includes(
              "Autorização: Indisponibilidade Orçamentária total ou parcial",
            ));

        // Só adicionar a etapa "Autorizar Emissão de R.O" se a autorização foi aprovada com disponibilidade orçamentária
        if (isAuthorizedWithBudget) {
          baseSteps.push({
            name: "Autorizar Emissão de R.O",
            phase: "Execução",
          });
        }

        // Só adicionar a etapa "Solicitar disponibilização de orçamento" se a autorização foi negada com indisponibilidade orçamentária
        if (isAuthorizedWithoutBudget) {
          baseSteps.push({
            name: "Solicitar disponibilização de orçamento",
            phase: "Preparação",
          });
        }

        return baseSteps;
      })(),

      // SUBCC - Subgerência de Contratos e Convênios
      SUBCC: [
        {
          name: "Fluxo reavaliação do plano de trabalho",
          phase: "Reavaliação",
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

  // Handle step toggle
  const handleStepToggle = async (stepId: number, isCompleted: boolean) => {
    try {
      console.log(
        `🔍 ProcessDetail handleStepToggle: ${stepId} para isCompleted: ${isCompleted}`,
      );

      const step = steps?.find((s) => s.id === stepId);
      if (!step) return;

      // Verificar se é a etapa de Autorização pelo Secretário SEAP
      if (
        step.stepName.includes("Autorização pelo Secretário SEAP") &&
        isCompleted
      ) {
        console.log(
          "🔥 ProcessDetail - Etapa de Autorização detectada - abrindo modal de autorização",
        );
        setStepForAuthorization(step);
        setAuthorizationModalOpen(true);
        setAuthorizationDecision(""); // Limpar seleção anterior
        return; // NÃO CONTINUA - Etapa só será concluída após escolher opção no modal
      }

      const response = await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepId}`,
        {
          isCompleted,
        },
      );

      if (response.ok) {
        console.log("Etapa atualizada com sucesso");

        // Se a etapa "Autorizar Emissão de R.O" foi completada, apenas mostrar mensagem
        if (isCompleted && step.stepName === "Autorizar Emissão de R.O") {
          console.log(
            "🔥 ProcessDetail - Etapa 'Autorizar Emissão de R.O' completada",
          );

          toast({
            title: "✅ Etapa Concluída",
            description:
              "Etapa 'Autorizar Emissão de R.O' foi concluída com sucesso",
          });
        } else {
          toast({
            title: isCompleted ? "Etapa concluída" : "Etapa desmarcada",
            description: isCompleted
              ? "A etapa foi marcada como concluída."
              : "A etapa foi desmarcada.",
          });
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}/steps`],
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

  // Função para rejeitar autorização (baseada na função de aprovação)
  const handleAuthorizationRejection = async () => {
    console.log("🔥 MODAL REJEIÇÃO - Função chamada!", {
      stepForAuthorizationRejection,
      authorizationRejectionDecision,
    });

    if (!stepForAuthorizationRejection || !authorizationRejectionDecision) {
      console.log("🔥 MODAL REJEIÇÃO - Validação falhou:", {
        stepForAuthorizationRejection: !!stepForAuthorizationRejection,
        authorizationRejectionDecision: !!authorizationRejectionDecision,
      });
      return;
    }

    try {
      console.log(
        "🔥🔥🔥 ProcessDetail - Rejeitando autorização com decisão:",
        authorizationRejectionDecision,
      );

      let stepId = stepForAuthorizationRejection.id;

      // Se não tem ID, criar a etapa primeiro
      if (!stepId) {
        console.log("🔥🔥🔥 ProcessDetail - Criando etapa antes de rejeitar");
        const createResponse = await apiRequest(
          "POST",
          `/api/processes/${parsedId}/steps`,
          {
            stepName: stepForAuthorizationRejection.stepName,
            departmentId: stepForAuthorizationRejection.departmentId,
            isVisible: true,
            isCompleted: false,
          },
        );

        if (createResponse.ok) {
          const newStep = await createResponse.json();
          stepId = newStep.id;
          console.log("🔥🔥🔥 ProcessDetail - Etapa criada com ID:", stepId);
        } else {
          throw new Error("Erro ao criar etapa");
        }
      }

      const response = await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepId}`,
        {
          isCompleted: true,
          observations: `REJEIÇÃO: ${authorizationRejectionDecision}`,
          rejectedAt: new Date().toISOString(),
          rejectionStatus: authorizationRejectionDecision,
          userId: currentUser?.id,
        },
      );

      if (response.ok) {
        console.log(
          "🔍 ProcessDetail - Decisão de rejeição tomada:",
          authorizationRejectionDecision,
        );

        // Se a decisão for "Não autorizar a defesa", criar etapa intermediária no mesmo setor
        if (
          authorizationRejectionDecision ===
          "Não autorizar a defesa ou solicitar reformulação da demanda"
        ) {
          console.log(
            "🔥🔥🔥 ProcessDetail - Tornando visível etapa 'Devolver para correção ou arquivamento'",
          );

          try {
            // Buscar todas as etapas (incluindo invisíveis) para encontrar a etapa existente
            const stepsResponse = await fetch(`/api/processes/${parsedId}/steps/all`);
            if (stepsResponse.ok) {
              const allSteps = await stepsResponse.json();
              const intermediateStep = allSteps.find(
                (s: any) => s.stepName === "Devolver para correção ou arquivamento" && s.departmentId === 5 // Secretário de Estado
              );

              if (intermediateStep) {
                console.log(
                  "✅ ProcessDetail - Etapa 'Devolver para correção ou arquivamento' encontrada, tornando visível"
                );
                
                // Tornar a etapa visível no próprio Secretário de Estado
                const updateResponse = await apiRequest(
                  "PATCH",
                  `/api/processes/${parsedId}/steps/${intermediateStep.id}`,
                  {
                    isVisible: true,
                  }
                );
                
                if (updateResponse.ok) {
                  console.log("✅✅✅ ProcessDetail - Etapa 'Devolver para correção ou arquivamento' tornada visível com sucesso no Secretário de Estado");
                  
                  // Recarregar dados para mostrar a etapa visível
                  queryClient.invalidateQueries({
                    queryKey: [`/api/processes/${parsedId}/steps`],
                  });
                  
                  // NÃO transferir automaticamente - usuário deve fazer tramitação manual
                }
              } else {
                console.log("⚠️ ProcessDetail - Etapa 'Devolver para correção ou arquivamento' não encontrada, criando nova etapa");
                
                // Criar a etapa se não existir
                const createResponse = await apiRequest(
                  "POST",
                  `/api/processes/${parsedId}/steps`,
                  {
                    stepName: "Devolver para correção ou arquivamento",
                    departmentId: 5, // Secretário de Estado
                    isCompleted: false,
                    isVisible: true,
                    observations: null,
                  }
                );
                
                if (createResponse.ok) {
                  console.log("✅✅✅ ProcessDetail - Etapa 'Devolver para correção ou arquivamento' criada com sucesso no Secretário de Estado");
                  
                  // Recarregar dados para mostrar a nova etapa
                  queryClient.invalidateQueries({
                    queryKey: [`/api/processes/${parsedId}/steps`],
                  });
                  
                } else {
                  console.error("❌ ProcessDetail - Erro ao criar etapa 'Devolver para correção ou arquivamento'");
                }
              }
            }
          } catch (intermediateStepError) {
            console.error(
              "❌ ProcessDetail - Erro ao tornar etapa visível:",
              intermediateStepError,
            );
          }
        }

        // Se a decisão for sobre recurso de convênio, tornar visível a etapa "Solicitar ajuste/aditivo do plano de trabalho"
        if (
          authorizationRejectionDecision ===
          "Recurso de convênio insuficiente - Valor estimado na pesquisa maior que o valor conveniado"
        ) {
          console.log(
            "🔥🔥🔥 ProcessDetail - Tornando visível etapa 'Solicitar ajuste/aditivo do plano de trabalho' para ajuste de convênio",
          );

          try {
            // Buscar todas as etapas (incluindo invisíveis) para encontrar a etapa condicional
            const stepsResponse = await fetch(
              `/api/processes/${parsedId}/steps/all`,
            );
            if (stepsResponse.ok) {
              const allSteps = await stepsResponse.json();
              const ajusteStep = allSteps.find(
                (s: any) =>
                  s.stepName ===
                    "Solicitar ajuste/aditivo do plano de trabalho" &&
                  s.isVisible === false,
              );

              if (ajusteStep) {
                // Tornar a etapa visível
                console.log(
                  "🔥🔥🔥 ProcessDetail - Tornando etapa 'Solicitar ajuste/aditivo do plano de trabalho' visível",
                );
                const updateResponse = await apiRequest(
                  "PATCH",
                  `/api/processes/${parsedId}/steps/${ajusteStep.id}`,
                  {
                    isVisible: true,
                  },
                );

                if (updateResponse.ok) {
                  console.log(
                    "✅✅✅ ProcessDetail - Etapa 'Solicitar ajuste/aditivo do plano de trabalho' tornada visível com sucesso",
                  );
                } else {
                  console.error(
                    "❌❌❌ ProcessDetail - Erro ao tornar etapa 'Solicitar ajuste/aditivo do plano de trabalho' visível",
                  );
                }
              } else {
                console.log(
                  "⚠️ ProcessDetail - Etapa 'Solicitar ajuste/aditivo do plano de trabalho' não encontrada",
                );
              }
            }
          } catch (etapasError) {
            console.error(
              "❌ ProcessDetail - Erro ao verificar/atualizar etapa de ajuste:",
              etapasError,
            );
          }
        }

        await queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}`],
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}/steps`],
        });

        // Toast removido conforme solicitado
        // toast({
        //   title: "❌ Etapa Rejeitada",
        //   description:
        //     authorizationRejectionDecision === "Não autorizar a defesa ou solicitar reformulação da demanda"
        //       ? `Rejeição: ${authorizationRejectionDecision}. Etapa de correção criada automaticamente.`
        //       : authorizationRejectionDecision === "Recurso de convênio insuficiente - Valor estimado na pesquisa maior que o valor conveniado"
        //         ? `Rejeição: ${authorizationRejectionDecision}. Etapa de ajuste criada automaticamente.`
        //         : `Rejeição: ${authorizationRejectionDecision}`,
        //   variant: "destructive",
        // });

        // Fechar modal e limpar estados
        setAuthorizationRejectionModalOpen(false);
        setAuthorizationRejectionDecision("");
        setStepForAuthorizationRejection(null);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao rejeitar autorização",
        variant: "destructive",
      });
    }
  };

  // Função para lidar com etapas de correção (apenas concluir etapa)
  const handleCorrectionStepComplete = async (step: any, stepName: string) => {
    try {
      console.log(
        `🔄 ProcessDetail - Concluindo etapa de correção: ${stepName}`,
      );

      // Marcar a etapa de correção como concluída
      await apiRequest("PATCH", `/api/processes/${parsedId}/steps/${step.id}`, {
        isCompleted: true,
        observations: `Correção finalizada: ${stepName} - Pronto para tramitação manual`,
        userId: 1,
      });

      // Invalidar cache
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}/steps`],
      });

      toast({
        title: "✅ Etapa Concluída",
        description: `${stepName} concluída. Use o botão "Tramitar" para transferir o processo.`,
      });
    } catch (error) {
      console.error("Erro ao concluir etapa:", error);
      toast({
        title: "Erro",
        description: "Erro ao concluir a etapa",
        variant: "destructive",
      });
    }
  };

  // Função para completar correção depois de escolher a opção
  const handleCorrectionComplete = async () => {
    console.log("🔥 MODAL CORREÇÃO - Função chamada!", {
      stepForCorrection,
      correctionDecision,
    });

    if (!stepForCorrection || !correctionDecision) {
      console.log("🔥 MODAL CORREÇÃO - Validação falhou:", {
        stepForCorrection: !!stepForCorrection,
        correctionDecision: !!correctionDecision,
      });
      return;
    }

    try {
      console.log(
        "🔥🔥🔥 ProcessDetail - Completando correção com decisão:",
        correctionDecision,
      );

      // Marcar a etapa de correção como concluída
      await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepForCorrection.id}`,
        {
          isCompleted: true,
          observations: `Decisão: ${correctionDecision}`,
          userId: currentUser?.id,
        },
      );

      if (
        correctionDecision ===
        "Encaminhar ao documento de formalização da demanda novamente"
      ) {
        toast({
          title: "✅ Decisão Registrada",
          description:
            "Decisão registrada. Use o botão 'Tramitar' para transferir o processo ao setor apropriado para reiniciar o fluxo.",
        });
      } else if (correctionDecision === "Arquivar processo") {
        // NÃO transferir automaticamente - usuário deve fazer tramitação manual
        
        toast({
          title: "✅ Decisão Registrada",
          description: "Decisão registrada. Use o botão 'Tramitar' para transferir o processo ao setor apropriado para arquivamento.",
        });
      }

      // Fechar modal e limpar estados
      setCorrectionModalOpen(false);
      setCorrectionDecision("");
      setStepForCorrection(null);

      // Invalidar cache para garantir atualização
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}/steps`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}`],
      });
    } catch (error) {
      console.error("Erro ao completar correção:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar a decisão de correção",
        variant: "destructive",
      });
    }
  };

  // Função para arquivar processo por reavaliação SUBCC
  const handleSubccRevaluation = async () => {
    console.log("🔥 MODAL SUBCC REAVALIAÇÃO - Função chamada!", {
      stepForSubccRevaluation,
    });

    if (!stepForSubccRevaluation) {
      console.log("🔥 MODAL SUBCC REAVALIAÇÃO - Validação falhou");
      return;
    }

    try {
      console.log(
        "🔥🔥🔥 ProcessDetail - Arquivando processo por reavaliação SUBCC",
      );

      // Criar etapa se não existir
      let stepId = stepForSubccRevaluation.id;
      if (!stepId) {
        console.log("🔥🔥🔥 ProcessDetail - Criando etapa de reavaliação SUBCC");
        const createResponse = await apiRequest(
          "POST",
          `/api/processes/${parsedId}/steps`,
          {
            stepName: "Fluxo reavaliação do plano de trabalho",
            departmentId: process?.currentDepartmentId || 11,
            isVisible: true,
            isCompleted: false,
          },
        );

        if (createResponse.ok) {
          const newStep = await createResponse.json();
          stepId = newStep.id;
          console.log("🔥🔥🔥 ProcessDetail - Etapa criada com ID:", stepId);
        } else {
          throw new Error("Erro ao criar etapa");
        }
      }

      // Completar a etapa
      await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepId}`,
        {
          isCompleted: true,
          observations: "Processo arquivado por reavaliação - SUBCC",
          userId: currentUser?.id,
        },
      );

      // Arquivar o processo (soft delete para aba Arquivados)
      await apiRequest("DELETE", `/api/processes/${parsedId}`, {
        deletionReason: "Arquivado por processo em reavaliação pela Subgerência de Contratos e Convênios - SUBCC",
      });

      // Fechar modal e limpar estados
      setSubccRevaluationModalOpen(false);
      setStepForSubccRevaluation(null);

      // Invalidar cache para garantir atualização
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}/steps`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}`],
      });

      toast({
        title: "✅ Processo Arquivado",
        description: "Processo foi arquivado por reavaliação SUBCC e movido para a aba 'Arquivados'. Redirecionando...",
      });

      // Redirecionar para página de processos
      setTimeout(() => {
        window.location.href = "/processes";
      }, 2000);

    } catch (error) {
      console.error("Erro ao arquivar processo por reavaliação SUBCC:", error);
      toast({
        title: "❌ Erro",
        description: "Erro ao arquivar processo por reavaliação SUBCC",
        variant: "destructive",
      });
    }
  };

  // Função para arquivar processo final
  const handleArchiveProcess = async () => {
    console.log("🔥 MODAL ARQUIVAMENTO - Função chamada!", {
      stepForArchive,
    });

    if (!stepForArchive) {
      console.log("🔥 MODAL ARQUIVAMENTO - Validação falhou");
      return;
    }

    try {
      console.log(
        "🔥🔥🔥 ProcessDetail - Arquivando processo definitivamente",
      );

      // Criar etapa se não existir
      let stepId = stepForArchive.id;
      if (!stepId) {
        console.log("🔥🔥🔥 ProcessDetail - Criando etapa de arquivamento final");
        const createResponse = await apiRequest(
          "POST",
          `/api/processes/${parsedId}/steps`,
          {
            stepName: "Arquivar processo - Final",
            departmentId: process?.currentDepartmentId || 2,
            isVisible: true,
            isCompleted: false,
          },
        );

        if (createResponse.ok) {
          const newStep = await createResponse.json();
          stepId = newStep.id;
          console.log("🔥🔥🔥 ProcessDetail - Etapa criada com ID:", stepId);
        } else {
          throw new Error("Erro ao criar etapa");
        }
      }

      // Completar a etapa
      await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepId}`,
        {
          isCompleted: true,
          observations: "Processo arquivado - Não autorizado pelo Secretário de Estado da Administração - SEAP",
          userId: currentUser?.id,
        },
      );

      // Arquivar o processo (soft delete para aba Arquivados)
      await apiRequest("DELETE", `/api/processes/${parsedId}`, {
        deletionReason: "Arquivado por processo não autorizado pelo Secretário de Estado da Administração - SEAP",
      });

      // Fechar modal e limpar estados
      setArchiveModalOpen(false);
      setStepForArchive(null);

      // Invalidar cache para garantir atualização
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}/steps`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}`],
      });

      toast({
        title: "✅ Processo Arquivado",
        description: "Processo foi arquivado e movido para a aba 'Arquivados'. Redirecionando...",
      });

      // Redirecionar para página de processos
      setTimeout(() => {
        window.location.href = "/processes";
      }, 2000);

    } catch (error) {
      console.error("Erro ao arquivar processo:", error);
      toast({
        title: "❌ Erro",
        description: "Erro ao arquivar processo",
        variant: "destructive",
      });
    }
  };

  // Função para completar autorização depois de escolher a opção
  const handleAuthorizationComplete = async () => {
    console.log("🔥 MODAL AUTORIZAÇÃO - Função chamada!", {
      stepForAuthorization,
      authorizationDecision,
    });

    if (!stepForAuthorization || !authorizationDecision) {
      console.log("🔥 MODAL AUTORIZAÇÃO - Validação falhou:", {
        stepForAuthorization: !!stepForAuthorization,
        authorizationDecision: !!authorizationDecision,
      });
      return;
    }

    try {
      console.log(
        "🔥🔥🔥 ProcessDetail - Completando autorização com decisão:",
        authorizationDecision,
      );

      const response = await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepForAuthorization.id}`,
        {
          isCompleted: true,
          observations: `Autorização: ${authorizationDecision}`,
          userId: currentUser?.id,
        },
      );

      if (response.ok) {
        // Se a decisão for "Disponibilidade Orçamentária", tornar visível a etapa "Autorizar Emissão de R.O"
        if (authorizationDecision === "Disponibilidade Orçamentária") {
          console.log(
            "🔥🔥🔥 ProcessDetail - Tornando visível etapa 'Autorizar Emissão de R.O' para disponibilidade orçamentária",
          );

          try {
            // Buscar todas as etapas (incluindo invisíveis) para encontrar a etapa condicional
            const stepsResponse = await fetch(
              `/api/processes/${parsedId}/steps/all`,
            );
            if (stepsResponse.ok) {
              const allSteps = await stepsResponse.json();
              const authRoStep = allSteps.find(
                (s: any) =>
                  s.stepName === "Autorizar Emissão de R.O" &&
                  s.isVisible === false,
              );

              if (authRoStep) {
                // Tornar a etapa visível
                console.log(
                  "🔥🔥🔥 ProcessDetail - Tornando etapa 'Autorizar Emissão de R.O' visível",
                );
                const updateResponse = await apiRequest(
                  "PATCH",
                  `/api/processes/${parsedId}/steps/${authRoStep.id}`,
                  {
                    isVisible: true,
                  },
                );

                if (updateResponse.ok) {
                  console.log(
                    "✅✅✅ ProcessDetail - Etapa 'Autorizar Emissão de R.O' tornada visível com sucesso",
                  );
                } else {
                  console.error(
                    "❌❌❌ ProcessDetail - Erro ao tornar etapa 'Autorizar Emissão de R.O' visível",
                  );
                }
              } else {
                console.log(
                  "⚠️ ProcessDetail - Etapa 'Autorizar Emissão de R.O' não encontrada",
                );
              }
            }
          } catch (etapasError) {
            console.error(
              "❌ ProcessDetail - Erro ao verificar/atualizar etapa:",
              etapasError,
            );
          }
        }

        // Se a decisão for indisponibilidade orçamentária, tornar visível a etapa "Solicitar disponibilização de orçamento"
        if (
          authorizationDecision === "Indisponibilidade Orçamentária Total" ||
          authorizationDecision === "Indisponibilidade Orçamentária Parcial" ||
          authorizationDecision ===
            "Indisponibilidade Orçamentária total ou parcial"
        ) {
          console.log(
            "🔥🔥🔥 ProcessDetail - Tornando visível etapa 'Solicitar disponibilização de orçamento' para indisponibilidade orçamentária",
          );

          try {
            // Buscar todas as etapas (incluindo invisíveis) para encontrar a etapa condicional
            const stepsResponse = await fetch(
              `/api/processes/${parsedId}/steps/all`,
            );
            if (stepsResponse.ok) {
              const allSteps = await stepsResponse.json();
              const solicitarOrcamentoStep = allSteps.find(
                (s: any) =>
                  s.stepName === "Solicitar disponibilização de orçamento" &&
                  s.isVisible === false,
              );

              if (solicitarOrcamentoStep) {
                // Tornar a etapa visível
                console.log(
                  "🔥🔥🔥 ProcessDetail - Tornando etapa 'Solicitar disponibilização de orçamento' visível",
                );
                const updateResponse = await apiRequest(
                  "PATCH",
                  `/api/processes/${parsedId}/steps/${solicitarOrcamentoStep.id}`,
                  {
                    isVisible: true,
                  },
                );

                if (updateResponse.ok) {
                  console.log(
                    "✅✅✅ ProcessDetail - Etapa 'Solicitar disponibilização de orçamento' tornada visível com sucesso",
                  );
                } else {
                  console.error(
                    "❌❌❌ ProcessDetail - Erro ao tornar etapa 'Solicitar disponibilização de orçamento' visível",
                  );
                }
              } else {
                console.log(
                  "⚠️ ProcessDetail - Etapa 'Solicitar disponibilização de orçamento' não encontrada",
                );
              }
            }
          } catch (etapasError) {
            console.error(
              "❌ ProcessDetail - Erro ao verificar/atualizar etapa de orçamento:",
              etapasError,
            );
          }
        }

        await queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}`],
        });
        await queryClient.invalidateQueries({
          queryKey: [`/api/processes/${parsedId}/steps`],
        });

        toast({
          title: "✅ Etapa Aprovada",
          description:
            authorizationDecision === "Disponibilidade Orçamentária"
              ? `Autorização concluída: ${authorizationDecision}. Próximas etapas criadas automaticamente.`
              : authorizationDecision ===
                    "Indisponibilidade Orçamentária Total" ||
                  authorizationDecision ===
                    "Indisponibilidade Orçamentária Parcial"
                ? `Autorização concluída: ${authorizationDecision}. Próximas etapas criadas automaticamente.`
                : `Autorização concluída: ${authorizationDecision}`,
        });

        // Fechar modal e limpar estados
        setAuthorizationModalOpen(false);
        setAuthorizationDecision("");
        setStepForAuthorization(null);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao completar autorização",
        variant: "destructive",
      });
    }
  };

  // Função para rejeitar uma etapa
  const handleStepReject = (step: ProcessStep) => {
    setStepToReject(step);
    setRejectionComment("");
    setRejectModalOpen(true);
  };

  // Função para confirmar rejeição
  const confirmStepRejection = async () => {
    if (!stepToReject || rejectionComment.trim().length < 10) {
      toast({
        title: "Motivo obrigatório",
        description:
          "Por favor, informe o motivo da rejeição (mínimo 10 caracteres)",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest(
        "PATCH",
        `/api/processes/${parsedId}/steps/${stepToReject.id}`,
        {
          rejectionStatus: "rejected",
          observations: rejectionComment.trim(),
          isCompleted: false,
          userId: currentUser?.id,
        },
      );

      await queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}`],
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/processes/${parsedId}/steps`],
      });

      // Toast removido conforme solicitado
      // toast({
      //   title: "❌ Etapa Rejeitada",
      //   description: `Etapa "${stepToReject.stepName}" foi rejeitada`,
      //   variant: "destructive",
      // });

      setRejectModalOpen(false);
      setStepToReject(null);
      setRejectionComment("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao rejeitar etapa",
        variant: "destructive",
      });
    }
  };

  // Handle delete process
  const handleDelete = async () => {
    if (deletionReason.trim().length < 10) {
      toast({
        title: "Motivo obrigatório",
        description:
          "Por favor, informe o motivo da exclusão (mínimo 10 caracteres)",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/processes/${parsedId}`, {
        deletionReason: deletionReason.trim(),
      });

      // Show success toast
      toast({
        title: "Processo excluído",
        description: "O processo foi movido para a lixeira com sucesso",
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
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeletionReason("");
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

          <Button
            variant="destructive"
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="flow">Fluxo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="space-y-6">
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
                          Histórico de Responsabilidades
                        </dt>
                        <dd className="text-sm text-gray-900 col-span-2">
                          {historyLoading ? (
                            <div className="text-xs text-gray-500">
                              Carregando histórico...
                            </div>
                          ) : responsibilityHistory &&
                            responsibilityHistory.length > 0 ? (
                            <div className="space-y-2">
                              {responsibilityHistory.map((history, index) => (
                                <div
                                  key={history.id}
                                  className="flex items-start space-x-2"
                                >
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-900">
                                      <span className="font-medium">
                                        {history.fullName || history.username}
                                      </span>
                                      {history.departmentName && (
                                        <span className="text-gray-500">
                                          {" "}
                                          ({history.departmentName})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {history.action === "created"
                                        ? "Criou o processo"
                                        : history.action === "updated"
                                          ? "Modificou o processo"
                                          : history.action === "transferred"
                                            ? "Transferiu o processo"
                                            : history.action === "returned"
                                              ? "Retornou o processo"
                                              : history.description ||
                                                history.action}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {format(
                                        new Date(history.timestamp),
                                        "dd/MM/yyyy HH:mm",
                                        { locale: ptBR },
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              Responsável atual:{" "}
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
                          )}
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

                                // Adicionar etapas condicionais visíveis que pertencem ao departamento atual
                                const conditionalSteps =
                                  steps?.filter((step) => {
                                    // Etapas condicionais específicas
                                    const isConditionalStep = [
                                      "Devolver para correção ou arquivamento", // Apenas no Secretário de Estado
                                      "Solicitar ajuste/aditivo do plano de trabalho",
                                      "Autorizar Emissão de R.O",
                                    ].includes(step.stepName);

                                    // Pertence ao departamento atual e está visível
                                    const belongsToCurrentDept =
                                      step.departmentId ===
                                      process?.currentDepartmentId;

                                    // ESPECIAL: "Devolver para correção ou arquivamento" só aparece no Secretário de Estado (ID 5)
                                    if (
                                      step.stepName ===
                                      "Devolver para correção ou arquivamento"
                                    ) {
                                      return (
                                        belongsToCurrentDept &&
                                        step.isVisible &&
                                        process?.currentDepartmentId === 5
                                      );
                                    }

                                    return (
                                      isConditionalStep &&
                                      belongsToCurrentDept &&
                                      step.isVisible
                                    );
                                  }) || [];

                                // Remover duplicatas de etapas condicionais (usar apenas a mais recente)
                                const uniqueConditionalSteps =
                                  conditionalSteps.reduce(
                                    (unique: any[], current) => {
                                      const existingIndex = unique.findIndex(
                                        (step) =>
                                          step.stepName === current.stepName,
                                      );
                                      if (existingIndex >= 0) {
                                        // Se já existe, manter apenas a mais recente (maior ID)
                                        if (
                                          current.id > unique[existingIndex].id
                                        ) {
                                          unique[existingIndex] = current;
                                        }
                                      } else {
                                        unique.push(current);
                                      }
                                      return unique;
                                    },
                                    [],
                                  );

                                // Converter etapas condicionais para o formato de sectorStep
                                const conditionalSectorSteps =
                                  uniqueConditionalSteps.map((step) => ({
                                    name: step.stepName,
                                    phase: "Condicional",
                                  }));

                                // Combinar etapas do setor com etapas condicionais
                                const allSteps = [
                                  ...sectorSteps,
                                  ...conditionalSectorSteps,
                                ];

                                console.log(
                                  "🔍 Etapas condicionais visíveis encontradas:",
                                  conditionalSteps.map((s) => s.stepName),
                                );
                                console.log(
                                  "🔍 Total de etapas para exibir:",
                                  allSteps.length,
                                );

                                return allSteps;
                              })()
                                .filter((sectorStep) => {
                                  // Mostrar apenas etapas pendentes (não concluídas)
                                  // Para etapas condicionais, encontrar a mais recente
                                  const allMatchingSteps =
                                    steps?.filter(
                                      (s) => s.stepName === sectorStep.name,
                                    ) || [];

                                  // Se for etapa condicional com duplicatas, usar apenas a mais recente
                                  const existingStep =
                                    allMatchingSteps.length > 1
                                      ? allMatchingSteps.reduce(
                                          (latest, current) =>
                                            current.id > latest.id
                                              ? current
                                              : latest,
                                        )
                                      : allMatchingSteps[0];

                                  return !existingStep?.isCompleted;
                                })
                                .map((sectorStep, index) => {
                                  // Para etapas condicionais, encontrar a mais recente
                                  const allMatchingSteps =
                                    steps?.filter(
                                      (s) => s.stepName === sectorStep.name,
                                    ) || [];

                                  // Se for etapa condicional com duplicatas, usar apenas a mais recente
                                  const existingStep =
                                    allMatchingSteps.length > 1
                                      ? allMatchingSteps.reduce(
                                          (latest, current) =>
                                            current.id > latest.id
                                              ? current
                                              : latest,
                                        )
                                      : allMatchingSteps[0];
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

                                            // Verificar se é a etapa especial de Autorização pelo Secretário SEAP
                                            if (
                                              sectorStep.name.includes(
                                                "Autorização pelo Secretário SEAP",
                                              )
                                            ) {
                                              console.log(
                                                "🔥 ProcessDetail - Etapa de Autorização detectada - abrindo modal de autorização",
                                              );
                                              setAuthorizationModalOpen(true);
                                              setStepForAuthorization(
                                                existingStep || null,
                                              );
                                              setAuthorizationDecision(""); // Limpar seleção anterior
                                              return; // NÃO CONTINUA - Etapa só será concluída após escolher opção no modal
                                            }

                                            // Verificar se é a etapa de Arquivar processo no Setor Demandante (AGORA MANUAL)
                                            if (
                                              sectorStep.name === "Arquivar processo" &&
                                              currentUser.department === "Setor Demandante"
                                            ) {
                                              console.log(
                                                "🔥 ProcessDetail - Etapa de arquivamento no Setor Demandante - completando etapa (transferência manual)",
                                              );
                                              
                                              // Criar etapa se não existir
                                              let stepId = existingStep?.id;
                                              if (!existingStep) {
                                                console.log("🔥🔥🔥 ProcessDetail - Criando etapa de arquivamento");
                                                const createResponse = await apiRequest(
                                                  "POST",
                                                  `/api/processes/${parsedId}/steps`,
                                                  {
                                                    stepName: sectorStep.name,
                                                    departmentId: process?.currentDepartmentId || 1,
                                                    isVisible: true,
                                                    isCompleted: false,
                                                  },
                                                );
                                              
                                                if (createResponse.ok) {
                                                  const newStep = await createResponse.json();
                                                  stepId = newStep.id;
                                                  console.log("🔥🔥🔥 ProcessDetail - Etapa criada com ID:", stepId);
                                                } else {
                                                  throw new Error("Erro ao criar etapa");
                                                }
                                              }
                                              
                                              // Apenas completar a etapa (sem transferir automaticamente)
                                              await apiRequest(
                                                "PATCH",
                                                `/api/processes/${parsedId}/steps/${stepId}`,
                                                {
                                                  isCompleted: true,
                                                  observations: "Processo pronto para arquivamento - aguardando transferência manual",
                                                  userId: currentUser?.id,
                                                },
                                              );
                                              
                                              // Refetch dos dados
                                              queryClient.invalidateQueries({
                                                queryKey: [`/api/processes/${parsedId}`],
                                              });
                                              queryClient.invalidateQueries({
                                                queryKey: [`/api/processes/${parsedId}/steps`],
                                              });
                                              
                                              toast({
                                                title: "✅ Etapa Concluída",
                                                description: "Processo marcado para arquivamento. Utilize o botão 'Transferir Processo' para enviar à Divisão de Licitação.",
                                              });
                                              
                                              return; // NÃO CONTINUA
                                            }

                                            // Verificar se é a etapa de Arquivar processo - Final (COM MODAL DE CONFIRMAÇÃO)
                                            if (
                                              sectorStep.name === "Arquivar processo - Final"
                                            ) {
                                              console.log(
                                                "🔥 ProcessDetail - Etapa de arquivamento final detectada - abrindo modal de confirmação",
                                              );
                                              
                                              setArchiveModalOpen(true);
                                              setStepForArchive(existingStep || null);
                                              return; // NÃO CONTINUA - Etapa só será concluída após confirmação no modal
                                            }

                                            // Verificar se é a etapa de Fluxo reavaliação do plano de trabalho - SUBCC (COM MODAL DE CONFIRMAÇÃO)
                                            if (
                                              sectorStep.name === "Fluxo reavaliação do plano de trabalho"
                                            ) {
                                              console.log(
                                                "🔥 ProcessDetail - Etapa de reavaliação SUBCC detectada - abrindo modal de confirmação",
                                              );
                                              
                                              setSubccRevaluationModalOpen(true);
                                              // Se a etapa não existe, criar um objeto temporário com as informações necessárias
                                              if (existingStep) {
                                                setStepForSubccRevaluation(existingStep);
                                              } else {
                                                // Criar objeto temporário para o modal funcionar
                                                setStepForSubccRevaluation({
                                                  id: null,
                                                  stepName: "Fluxo reavaliação do plano de trabalho",
                                                  departmentId: process?.currentDepartmentId || 11,
                                                  processId: parsedId,
                                                  isCompleted: false,
                                                  isVisible: true,
                                                } as any);
                                              }
                                              return; // NÃO CONTINUA - Etapa só será concluída após confirmação no modal
                                            }

                                            // Verificar se é a etapa de Devolver para correção ou cancelar processo
                                            if (
                                              sectorStep.name ===
                                              "Devolver para correção ou cancelar processo"
                                            ) {
                                              console.log(
                                                "🔥 ProcessDetail - Etapa de correção detectada - abrindo modal de correção",
                                              );

                                              // Se a etapa não existe, criar ela primeiro
                                              if (!existingStep) {
                                                console.log(
                                                  "🔄 ProcessDetail - Criando etapa 'Devolver para correção ou cancelar processo'",
                                                );
                                                
                                                try {
                                                  const response = await apiRequest(
                                                    "POST",
                                                    `/api/processes/${process.id}/steps`,
                                                    {
                                                      stepName: sectorStep.name,
                                                      departmentId: process.currentDepartmentId,
                                                      isCompleted: false,
                                                      isVisible: true,
                                                      observations: null,
                                                    },
                                                  );

                                                  if (response.ok) {
                                                    const newStep = await response.json();
                                                    setStepForCorrection(newStep);
                                                    setCorrectionModalOpen(true);
                                                    setCorrectionDecision("");
                                                    return;
                                                  }
                                                } catch (error) {
                                                  console.error("Erro ao criar etapa:", error);
                                                  toast({
                                                    title: "Erro",
                                                    description: "Erro ao criar etapa de correção",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }
                                              } else {
                                                // Se a etapa existe, usar ela
                                                setStepForCorrection(existingStep);
                                                setCorrectionModalOpen(true);
                                                setCorrectionDecision(""); // Limpar seleção anterior
                                                return; // NÃO CONTINUA - Etapa só será concluída após escolher opção no modal
                                              }
                                            }

                                            if (existingStep) {
                                              // Verificar se é a etapa de solicitação de ajuste/aditivo
                                              if (
                                                sectorStep.name ===
                                                "Solicitar ajuste/aditivo do plano de trabalho"
                                              ) {
                                                console.log(
                                                  "🔥 ProcessDetail - Etapa de ajuste detectada - marcando como concluída",
                                                );

                                                try {
                                                  // Marcar a etapa como concluída - tramitação para SUBCC será feita manualmente
                                                  await apiRequest(
                                                    "PATCH",
                                                    `/api/processes/${parsedId}/steps/${existingStep.id}`,
                                                    {
                                                      isCompleted: true,
                                                      observations:
                                                        "Solicitação de ajuste/aditivo concluída - Pronto para tramitação ao SUBCC",
                                                      userId: currentUser?.id,
                                                    },
                                                  );

                                                  // Atualizar dados na interface
                                                  queryClient.invalidateQueries(
                                                    {
                                                      queryKey: [
                                                        `/api/processes/${parsedId}`,
                                                      ],
                                                    },
                                                  );
                                                  queryClient.invalidateQueries(
                                                    {
                                                      queryKey: [
                                                        `/api/processes/${parsedId}/steps`,
                                                      ],
                                                    },
                                                  );

                                                  toast({
                                                    title: "✅ Etapa Concluída",
                                                    description:
                                                      "Processo pronto para tramitação ao SUBCC para reavaliação do plano de trabalho",
                                                  });
                                                } catch (error) {
                                                  console.error(
                                                    "Erro ao concluir etapa:",
                                                    error,
                                                  );
                                                  toast({
                                                    title: "Erro",
                                                    description:
                                                      "Erro ao concluir etapa",
                                                    variant: "destructive",
                                                  });
                                                }
                                              }
                                              // Verificar se é etapa condicional de correção (Devolver para correção ou arquivamento)
                                              else if (
                                                sectorStep.name ===
                                                "Devolver para correção ou arquivamento"
                                              ) {
                                                console.log(
                                                  "🔥 ProcessDetail - Etapa 'Devolver para correção ou arquivamento' detectada - apenas completando (tramitação manual necessária)",
                                                );

                                                try {
                                                  // Apenas completar a etapa atual - próxima etapa aparecerá após tramitação manual
                                                  await apiRequest(
                                                    "PATCH",
                                                    `/api/processes/${parsedId}/steps/${existingStep.id}`,
                                                    {
                                                      isCompleted: true,
                                                      observations: "Correção primeira etapa concluída - Aguardando tramitação manual para próxima etapa",
                                                      userId: currentUser?.id,
                                                    },
                                                  );

                                                  // Refrescar dados
                                                  queryClient.invalidateQueries({
                                                    queryKey: [`/api/processes/${parsedId}/steps`],
                                                  });

                                                  toast({
                                                    title: "✅ Etapa Concluída",
                                                    description: "Processo pronto para tramitação manual. Use o botão 'Tramitar Processo' para continuar o fluxo de correção.",
                                                  });
                                                } catch (error) {
                                                  console.error("Erro ao processar etapa de correção:", error);
                                                  toast({
                                                    title: "Erro",
                                                    description: "Erro ao processar etapa de correção",
                                                    variant: "destructive",
                                                  });
                                                }
                                              }
                                              // Verificar se é a etapa especial de Autorização pelo Secretário SEAP
                                              else if (
                                                sectorStep.name === "Autorização pelo Secretário SEAP"
                                              ) {
                                                console.log(
                                                  "🔥 ProcessDetail - Etapa 'Autorização pelo Secretário SEAP' detectada - abrindo modal de autorização",
                                                );
                                                setAuthorizationModalOpen(true);

                                                // Se não existe step, criar um objeto temporário com as informações necessárias
                                                if (existingStep) {
                                                  setStepForAuthorization(existingStep);
                                                } else {
                                                  // Criar objeto temporário para a etapa
                                                  const tempStep = {
                                                    id: 0, // ID temporário
                                                    processId: parsedId,
                                                    stepName: sectorStep.name,
                                                    departmentId: process.currentDepartmentId,
                                                    isCompleted: false,
                                                    observations: null,
                                                    completedAt: null,
                                                    completedBy: null,
                                                    dueDate: null,
                                                    rejectedAt: null,
                                                    rejectionStatus: null,
                                                    isLocked: false,
                                                    isVisible: true,
                                                  };
                                                  setStepForAuthorization(tempStep);
                                                }
                                                setAuthorizationDecision(""); // Limpar seleção anterior
                                                return; // NÃO CONTINUA - Modal deve ser usado
                                              } else {
                                                // Etapa normal, apenas atualizar
                                                handleStepToggle(
                                                  existingStep.id,
                                                  !isCompleted,
                                                );
                                              }
                                            } else {
                                              // Etapa não existe, criar primeiro
                                              try {
                                                const response =
                                                  await apiRequest(
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
                                                  queryClient.invalidateQueries(
                                                    {
                                                      queryKey: [
                                                        `/api/processes/${process.id}/steps`,
                                                      ],
                                                    },
                                                  );

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
                                          onClick={() => {
                                            if (!userCanEdit) return;

                                            // Verificar se é a etapa especial de Autorização pelo Secretário SEAP
                                            if (
                                              sectorStep.name.includes(
                                                "Autorização pelo Secretário SEAP",
                                              )
                                            ) {
                                              console.log(
                                                "🔥 ProcessDetail - Etapa de Autorização detectada - abrindo modal de rejeição especial",
                                              );
                                              setAuthorizationRejectionModalOpen(
                                                true,
                                              );

                                              // Se não existe step, criar um objeto temporário com as informações necessárias
                                              if (existingStep) {
                                                setStepForAuthorizationRejection(
                                                  existingStep,
                                                );
                                              } else {
                                                // Criar objeto temporário da etapa para usar no modal
                                                const tempStep = {
                                                  id: null, // Será criado quando confirmado
                                                  stepName: sectorStep.name,
                                                  departmentId:
                                                    process?.currentDepartmentId ||
                                                    0,
                                                  isVisible: true,
                                                  isCompleted: false,
                                                  processId: parsedId,
                                                };
                                                setStepForAuthorizationRejection(
                                                  tempStep as any,
                                                );
                                              }

                                              setAuthorizationRejectionDecision(
                                                "",
                                              ); // Limpar seleção anterior
                                              return; // NÃO CONTINUA - Etapa só será rejeitada após escolher opção no modal
                                            }

                                            if (existingStep) {
                                              handleStepReject(existingStep);
                                            } else {
                                              toast({
                                                title: "Erro",
                                                description:
                                                  "Esta etapa ainda não foi criada",
                                                variant: "destructive",
                                              });
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
                                  console.log(
                                    "🔄 Corrigindo checklist - resetando todas as etapas",
                                  );

                                  if (steps && currentDepartment) {
                                    // 1. Resetar todas as etapas do setor atual (marcar como incompletas)
                                    const allSectorSteps = steps.filter(
                                      (step) =>
                                        step.departmentId ===
                                        process?.currentDepartmentId,
                                    );

                                    for (const step of allSectorSteps) {
                                      await apiRequest(
                                        "PATCH",
                                        `/api/processes/${parsedId}/steps/${step.id}`,
                                        {
                                          isCompleted: false,
                                          observations: null,
                                          rejectedAt: null,
                                          rejectionStatus: null,
                                        },
                                      );
                                    }

                                    // 2. Tornar invisíveis apenas etapas condicionais que devem ser resetadas
                                    // EXCLUIR "Devolver para correção ou arquivamento" para não interferir no fluxo de rejeição
                                    const conditionalStepsToHide = steps.filter(
                                      (step) =>
                                        [
                                          "Solicitar ajuste/aditivo do plano de trabalho",
                                          "Autorizar Emissão de R.O",
                                          "Solicitar disponibilização de orçamento",
                                        ].includes(step.stepName),
                                    );

                                    for (const step of conditionalStepsToHide) {
                                      await apiRequest(
                                        "PATCH",
                                        `/api/processes/${parsedId}/steps/${step.id}`,
                                        { isVisible: false },
                                      );
                                    }
                                    
                                    console.log("🔄 ProcessDetail - Etapas condicionais escondidas (exceto correção/arquivamento):", conditionalStepsToHide.map(s => s.stepName));

                                    queryClient.invalidateQueries({
                                      queryKey: [
                                        `/api/processes/${parsedId}/steps`,
                                      ],
                                    });

                                    toast({
                                      title: "Checklist resetado",
                                      description:
                                        "Todas as etapas foram resetadas para o estado inicial.",
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Erro",
                                    description:
                                      "Não foi possível resetar o checklist.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Corrigir
                            </Button>
                            <p className="text-sm text-gray-600 mt-2">
                              Reseta todas as etapas para o estado inicial e
                              esconde etapas condicionais
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
                                  getPhaseDeadlines(
                                    new Date(process.createdAt),
                                  ),
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
            <p>Fluxograma será implementado aqui.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Rejeição de Etapa */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              Rejeitar Etapa
            </DialogTitle>
            <DialogDescription>
              Etapa: <strong>{stepToReject?.stepName}</strong>
              <br />
              Informe o motivo da rejeição desta etapa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Motivo da Rejeição *
              </label>
              <Textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Descreva o motivo da rejeição desta etapa..."
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 10 caracteres. {rejectionComment.length}/500
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRejectModalOpen(false);
                setStepToReject(null);
                setRejectionComment("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmStepRejection}
              disabled={rejectionComment.trim().length < 10}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar Etapa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Autorização do Secretário SEAP */}
      <Dialog
        open={authorizationModalOpen}
        onOpenChange={setAuthorizationModalOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Aprovar Etapa de Autorização
            </DialogTitle>
            <DialogDescription>
              Selecione uma das opções de autorização para a etapa:{" "}
              <strong>Autorização pelo Secretário SEAP</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="authorization-decision"
                    value="Disponibilidade Orçamentária"
                    checked={
                      authorizationDecision === "Disponibilidade Orçamentária"
                    }
                    onChange={(e) => setAuthorizationDecision(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Disponibilidade Orçamentária
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="authorization-decision"
                    value="Indisponibilidade Orçamentária total ou parcial"
                    checked={
                      authorizationDecision ===
                      "Indisponibilidade Orçamentária total ou parcial"
                    }
                    onChange={(e) => setAuthorizationDecision(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Indisponibilidade Orçamentária total ou parcial
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAuthorizationModalOpen(false);
                setAuthorizationDecision("");
                setStepForAuthorization(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                console.log("🔥 BOTÃO AUTORIZAÇÃO - Clicado!");
                handleAuthorizationComplete();
              }}
              disabled={!authorizationDecision}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar Autorização
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição da Autorização do Secretário SEAP */}
      <Dialog
        open={authorizationRejectionModalOpen}
        onOpenChange={setAuthorizationRejectionModalOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Rejeitar Etapa de Autorização
            </DialogTitle>
            <DialogDescription>
              Selecione o motivo da rejeição para a etapa:{" "}
              <strong>Autorização pelo Secretário SEAP</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="authorization-rejection-decision"
                    value="Não autorizar a defesa ou solicitar reformulação da demanda"
                    checked={
                      authorizationRejectionDecision ===
                      "Não autorizar a defesa ou solicitar reformulação da demanda"
                    }
                    onChange={(e) =>
                      setAuthorizationRejectionDecision(e.target.value)
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Não autorizar a defesa ou solicitar reformulação da
                      demanda
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="authorization-rejection-decision"
                    value="Recurso de convênio insuficiente - Valor estimado na pesquisa maior que o valor conveniado"
                    checked={
                      authorizationRejectionDecision ===
                      "Recurso de convênio insuficiente - Valor estimado na pesquisa maior que o valor conveniado"
                    }
                    onChange={(e) =>
                      setAuthorizationRejectionDecision(e.target.value)
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Recurso de convênio insuficiente - Valor estimado na
                      pesquisa maior que o valor conveniado
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAuthorizationRejectionModalOpen(false);
                setAuthorizationRejectionDecision("");
                setStepForAuthorizationRejection(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                console.log("🔥 BOTÃO REJEIÇÃO - Clicado!");
                handleAuthorizationRejection();
              }}
              disabled={!authorizationRejectionDecision}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Rejeição
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Correção ou Cancelamento */}
      <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Devolver para Correção ou Cancelar Processo
            </DialogTitle>
            <DialogDescription>
              Selecione uma das opções para a etapa:{" "}
              <strong>Devolver para correção ou cancelar processo</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="correction-decision"
                    value="Encaminhar ao documento de formalização da demanda novamente"
                    checked={
                      correctionDecision ===
                      "Encaminhar ao documento de formalização da demanda novamente"
                    }
                    onChange={(e) => setCorrectionDecision(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Encaminhar ao documento de formalização da demanda
                      novamente
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      O processo será transferido para a Divisão de Licitação e
                      reiniciado no fluxo inicial
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="correction-decision"
                    value="Arquivar processo"
                    checked={correctionDecision === "Arquivar processo"}
                    onChange={(e) => setCorrectionDecision(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Arquivar processo
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      O processo será transferido para a Divisão de Licitação
                      com etapa de correção
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCorrectionModalOpen(false);
                setCorrectionDecision("");
                setStepForCorrection(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                console.log("🔥 BOTÃO CORREÇÃO - Clicado!");
                handleCorrectionComplete();
              }}
              disabled={!correctionDecision}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Confirmar Ação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Arquivamento Final */}
      <Dialog open={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Archive className="h-5 w-5" />
              Confirmar arquivamento do processo #{process?.pbdocNumber}?
            </DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja arquivar este processo?{" "}
              <br />
              O processo será movido para a aba "Arquivados" com o motivo: <strong className="text-blue-600">"Arquivado por processo não autorizado pelo Secretário de Estado da Administração - SEAP"</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-yellow-800">
                    Atenção
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    O processo será arquivado e movido para a aba "Arquivados". O processo poderá ser restaurado posteriormente se necessário.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setArchiveModalOpen(false);
                setStepForArchive(null);
              }}
            >
              Não
            </Button>
            <Button
              onClick={() => {
                console.log("🔥 BOTÃO ARQUIVAMENTO - Clicado!");
                handleArchiveProcess();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Archive className="h-4 w-4 mr-2" />
              Sim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Reavaliação SUBCC */}
      <Dialog open={subccRevaluationModalOpen} onOpenChange={setSubccRevaluationModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Archive className="h-5 w-5" />
              Confirmar arquivamento do processo #{process?.pbdocNumber}?
            </DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja arquivar este processo?{" "}
              <br />
              O processo será movido para a aba "Arquivados" com o motivo: <strong className="text-blue-600">"Arquivado por processo em reavaliação pela Subgerência de Contratos e Convênios - SUBCC"</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-yellow-800">
                    Atenção
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    O processo será arquivado e movido para a aba "Arquivados" por reavaliação SUBCC. O processo poderá ser restaurado posteriormente se necessário.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSubccRevaluationModalOpen(false);
                setStepForSubccRevaluation(null);
              }}
            >
              Não
            </Button>
            <Button
              onClick={() => {
                console.log("🔥 BOTÃO REAVALIAÇÃO SUBCC - Clicado!");
                handleSubccRevaluation();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Archive className="h-4 w-4 mr-2" />
              Sim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modais existentes */}
    </div>
  );
};

export default ProcessDetail;
