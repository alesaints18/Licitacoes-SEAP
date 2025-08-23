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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [authorizationModalOpen, setAuthorizationModalOpen] = useState(false);
  const [authorizationMotivo, setAuthorizationMotivo] = useState("");

  // New flowchart states
  const [currentFlowchart, setCurrentFlowchart] = useState<string>("full");
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState("");
  const [imageTitle, setImageTitle] = useState("");

  // Zoom states for flowchart
  const [zoomLevel, setZoomLevel] = useState(100);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch process data
  const {
    data: process,
    isLoading: processLoading,
    error: processError,
  } = useQuery<
    Process & {
      modality: BiddingModality;
      source: ResourceSource;
      responsible: User;
    }
  >({
    queryKey: [`/api/processes/${id}`],
  });

  // Fetch process steps
  const {
    data: steps,
    isLoading: stepsLoading,
    error: stepsError,
  } = useQuery<ProcessStep[]>({
    queryKey: [`/api/processes/${id}/steps`],
  });

  // Fetch responsibility history
  const {
    data: responsibilityHistory,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery<
    Array<{
      id: number;
      processId: number;
      userId: number;
      username: string;
      fullName?: string;
      departmentId: number;
      departmentName?: string;
      action: string;
      description?: string;
      timestamp: string;
      comments?: string;
    }>
  >({
    queryKey: [`/api/processes/${id}/responsibility-history`],
  });

  // Get the current user to check permissions
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/status"],
  });

  // Get departments for transfer options
  const { data: departments } = useQuery<
    Array<{ id: number; name: string; description?: string }>
  >({
    queryKey: ["/api/departments"],
  });

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

      await apiRequest("PATCH", `/api/processes/${id}/steps/${stepId}`, {
        isCompleted,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${id}/steps`] });
    } catch (error) {
      console.error("Error toggling step:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar etapa",
        variant: "destructive",
      });
    }
  };

  // Handle step rejection
  const handleStepReject = async (stepId: number, reason: string) => {
    try {
      await apiRequest("PATCH", `/api/processes/${id}/steps/${stepId}`, {
        isCompleted: false,
        observations: `REJEITADO: ${reason}`,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/processes/${id}/steps`] });

      toast({
        title: "Etapa rejeitada",
        description: "A etapa foi rejeitada com sucesso",
      });
    } catch (error) {
      console.error("Error rejecting step:", error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar etapa",
        variant: "destructive",
      });
    }
  };

  // Handle process deletion
  const handleDelete = async () => {
    if (!process) return;

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
    }
  };

  // Handle department-specific flowchart display
  const handleFlowchartView = (departmentName: string) => {
    const imageMappings: { [key: string]: { src: string; title: string } } = {
      "Setor Demandante": {
        src: "/flowchart_setor_demandante.png",
        title: "Fluxograma - Setor Demandante",
      },
      "Divisão de Licitação": {
        src: "/flowchart_divisao_licitacao.png",
        title: "Fluxograma - Divisão de Licitação",
      },
      "Núcleo de Pesquisa de Preços – NPP": {
        src: "/flowchart_npp.png",
        title: "Fluxograma - Núcleo de Pesquisa de Preços",
      },
      "Unidade de Orçamento e Finanças": {
        src: "/flowchart_orcamento_financas.png",
        title: "Fluxograma - Unidade de Orçamento e Finanças",
      },
      "Secretário de Estado da Administração Penitenciária - SEAP": {
        src: "/flowchart_secretario_seap.png",
        title: "Fluxograma - Secretário SEAP",
      },
      "Assessoria Jurídica": {
        src: "/flowchart_assessoria_juridica.png",
        title: "Fluxograma - Assessoria Jurídica",
      },
      "Controladoria Geral do Estado": {
        src: "/flowchart_cge.png",
        title: "Fluxograma - Controladoria Geral do Estado",
      },
      "Consultoria Geral de Políticas Públicas e Contratos": {
        src: "/flowchart_cgpc.png",
        title: "Fluxograma - Consultoria Geral de Políticas Públicas",
      },
      "Unidade Técnico Normativa": {
        src: "/flowchart_unidade_tecnico_normativa.png",
        title: "Fluxograma - Unidade Técnico Normativa",
      },
      "Subchefia da Casa Civil": {
        src: "/flowchart_subcc.png",
        title: "Fluxograma - Subchefia da Casa Civil",
      },
      "Equipe de Pregão": {
        src: "/flowchart_equipe_pregao.png",
        title: "Fluxograma - Equipe de Pregão",
      },
    };

    const mapping = imageMappings[departmentName];
    if (mapping) {
      setCurrentImageSrc(mapping.src);
      setImageTitle(mapping.title);
      setShowFlowchartModal(true);
      setZoomLevel(100);
      setImagePosition({ x: 0, y: 0 });
    }
  };

  // Handle full flowchart display
  const handleFullFlowchartView = () => {
    setCurrentImageSrc("/fluxograma_seap_min.png");
    setImageTitle("Fluxograma Completo - SEAP");
    setShowFlowchartModal(true);
    setZoomLevel(100);
    setImagePosition({ x: 0, y: 0 });
  };

  // Zoom functions for flowchart
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 100, 500)); // Incremento de 100%, máximo 500%
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 100, 100)); // Decremento de 100%, mínimo 100%
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    setImagePosition({ x: 0, y: 0 });
  };

  // Mouse drag functionality for zoomed flowchart
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStart && zoomLevel > 100) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Escape key handler for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showFlowchartModal) {
        setShowFlowchartModal(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showFlowchartModal]);

  const getDepartmentIdFromName = (departmentName: string): number => {
    const departmentMap: { [key: string]: number } = {
      "Setor Demandante": 1,
      "Divisão de Licitação": 2,
      "Núcleo de Pesquisa de Preços – NPP": 3,
      "Unidade de Orçamento e Finanças": 4,
      "Secretário de Estado da Administração Penitenciária - SEAP": 5,
      "Assessoria Jurídica": 6,
      "Controladoria Geral do Estado": 7,
      "Consultoria Geral de Políticas Públicas e Contratos": 8,
      "Unidade Técnico Normativa": 9,
      "Subchefia da Casa Civil": 10,
      "Equipe de Pregão": 11,
    };

    return departmentMap[departmentName] || 1;
  };

  if (processLoading || stepsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando detalhes do processo...</p>
        </div>
      </div>
    );
  }

  if (processError || stepsError || !process) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Erro ao carregar dados do processo</p>
        </div>
      </div>
    );
  }

  const isOverdue = new Date(process.deadline) < new Date();
  const currentUserCanTransfer =
    currentUser &&
    (currentUser.role === "admin" ||
      departments?.find((dept) => dept.id === process.currentDepartmentId)
        ?.name === currentUser.department);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Processo Nº {process.pbdocNumber}
          </h1>
          <p className="text-gray-600 mb-2">{process.description}</p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                process.status === "draft"
                  ? "bg-gray-100 text-gray-800"
                  : process.status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : process.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : process.status === "canceled"
                        ? "bg-red-100 text-red-800"
                        : "bg-orange-100 text-orange-800"
              }`}
            >
              {getProcessStatusLabel(process.status)}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                process.priority === "high"
                  ? "bg-red-100 text-red-800"
                  : process.priority === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {getProcessPriorityLabel(process.priority)}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Clock className="h-3 w-3 inline mr-1" />
                Atrasado
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setLocation(`/processes/${process.id}/edit`)}
            variant="outline"
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            onClick={() => setLocation(`/processes/${process.id}/transfer`)}
            variant="outline"
            size="sm"
            disabled={!currentUserCanTransfer}
            title={
              !currentUserCanTransfer
                ? "Você não tem permissão para transferir este processo"
                : "Transferir processo"
            }
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Transferir
          </Button>
          <Button
            onClick={() => setLocation(`/report/${process.id}`)}
            variant="outline"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          {currentUser?.role === "admin" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação moverá o processo para a lixeira. Você tem certeza
                    que deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4">
                  <label className="block text-sm font-medium mb-2">
                    Motivo da Exclusão
                  </label>
                  <Textarea
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="Descreva o motivo da exclusão..."
                    rows={3}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={!deletionReason.trim()}
                  >
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Process Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Modalidade</dt>
              <dd className="text-sm text-gray-900">
                {process.modality?.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Fonte de Recursos
              </dt>
              <dd className="text-sm text-gray-900">
                {process.source?.description}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Responsável</dt>
              <dd className="text-sm text-gray-900">
                {process.responsible?.username}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Criado em</dt>
              <dd className="text-sm text-gray-900">
                {format(new Date(process.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Prazo de Entrega
              </dt>
              <dd
                className={`text-sm ${
                  isOverdue ? "text-red-600 font-medium" : "text-gray-900"
                }`}
              >
                {format(new Date(process.deadline), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
                {isOverdue && (
                  <span className="ml-2 inline-flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Vencido
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Departamento Atual
              </dt>
              <dd className="text-sm text-gray-900">
                {departments?.find((dept) => dept.id === process.currentDepartmentId)?.name ||
                  "N/A"}
              </dd>
            </div>
            {process.returnComments && (
              <div className="col-span-full">
                <dt className="text-sm font-medium text-gray-500">
                  Comentários de Retorno
                </dt>
                <dd className="text-sm text-gray-900 mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  {process.returnComments}
                </dd>
              </div>
            )}
            <div className="col-span-full">
              <dt className="text-sm font-medium text-gray-500 mb-2">
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
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </div>
                          {history.comments && (
                            <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                              {history.comments}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    Nenhum histórico disponível
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="flowchart">Fluxograma</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            {/* Process Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progresso do Processo</CardTitle>
              </CardHeader>
              <CardContent>
                {stepsLoading ? (
                  <p>Carregando etapas...</p>
                ) : steps && steps.length > 0 ? (
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-center space-x-3">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            step.isCompleted
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {step.isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-sm font-medium ${
                                step.isCompleted
                                  ? "text-gray-900"
                                  : "text-gray-500"
                              }`}
                            >
                              {step.stepName}
                            </p>
                            <span className="text-xs text-gray-400">
                              {step.phase}
                            </span>
                          </div>
                          {step.observations && (
                            <p className="text-xs text-gray-500 mt-1">
                              {step.observations}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Nenhuma etapa encontrada para este processo.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
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

        <TabsContent value="flowchart">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fluxograma do Processo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quick Access Buttons */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Button
                      onClick={handleFullFlowchartView}
                      variant="outline"
                      size="sm"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Fluxograma Completo
                    </Button>
                    {[
                      "Setor Demandante",
                      "Divisão de Licitação",
                      "Núcleo de Pesquisa de Preços – NPP",
                      "Unidade de Orçamento e Finanças",
                      "Secretário de Estado da Administração Penitenciária - SEAP",
                      "Assessoria Jurídica",
                      "Controladoria Geral do Estado",
                      "Consultoria Geral de Políticas Públicas e Contratos",
                      "Unidade Técnico Normativa",
                      "Subchefia da Casa Civil",
                      "Equipe de Pregão",
                    ].map((dept) => (
                      <Button
                        key={dept}
                        onClick={() => handleFlowchartView(dept)}
                        variant="outline"
                        size="sm"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        {dept.length > 20 ? `${dept.substring(0, 20)}...` : dept}
                      </Button>
                    ))}
                  </div>

                  {/* Sequência do Fluxograma para Comparação Manual */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">
                      Sequência do Fluxograma para Comparação Manual:
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Setor Demandante</li>
                      <li>2. Divisão de Licitação</li>
                      <li>3. Núcleo de Pesquisa de Preços – NPP</li>
                      <li>4. Unidade de Orçamento e Finanças</li>
                      <li>
                        5. Secretário de Estado da Administração Penitenciária -
                        SEAP
                      </li>
                      <li>6. Assessoria Jurídica</li>
                      <li>7. Controladoria Geral do Estado</li>
                      <li>
                        8. Consultoria Geral de Políticas Públicas e Contratos
                      </li>
                      <li>9. Unidade Técnico Normativa</li>
                      <li>10. Subchefia da Casa Civil</li>
                      <li>11. Equipe de Pregão</li>
                    </ol>
                  </div>

                  {/* Interactive Flowchart Component */}
                  {process && (
                    <BiddingFlowchart
                      departmentName={currentUser?.department || ""}
                      modalityId={process.modalityId}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Flowchart Modal */}
      {showFlowchartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-7xl max-h-screen w-full h-full p-4">
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {imageTitle}
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    onClick={handleZoomOut}
                    variant="ghost"
                    size="sm"
                    disabled={zoomLevel <= 100}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-sm font-medium min-w-[60px] text-center">
                    {zoomLevel}%
                  </span>
                  <Button
                    onClick={handleZoomIn}
                    variant="ghost"
                    size="sm"
                    disabled={zoomLevel >= 500}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleResetZoom} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button
                  onClick={() => setShowFlowchartModal(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image Container */}
            <div
              ref={containerRef}
              className="w-full h-full overflow-hidden rounded-lg bg-white mt-16"
              style={{ cursor: zoomLevel > 100 ? "grab" : "default" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={currentImageSrc}
                alt={imageTitle}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel / 100}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  transformOrigin: "center center",
                  imageRendering: "crisp-edges",
                  WebkitImageSmoothing: false,
                  cursor: isDragging ? "grabbing" : zoomLevel > 100 ? "grab" : "default",
                }}
                draggable={false}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.imageRendering = "optimizeQuality";
                  img.style.WebkitInterpolationMode = "high-quality";
                  img.style.msInterpolationMode = "high-quality";
                }}
              />
            </div>

            {/* Instructions */}
            {zoomLevel > 100 && (
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white text-sm px-3 py-2 rounded-lg">
                Arraste para mover a imagem
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessDetail;