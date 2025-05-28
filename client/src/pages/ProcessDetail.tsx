import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, BiddingModality, ResourceSource, User, ProcessStep } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StepChecklist from "@/components/bidding/StepChecklist";
import BiddingFlowchart from "@/components/bidding/BiddingFlowchart";
import { Edit, Trash, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProcessStatusLabel, getProcessPriorityLabel } from "@/lib/utils/process";
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

interface ProcessDetailProps {
  id: string;
}

const ProcessDetail = ({ id }: ProcessDetailProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const parsedId = parseInt(id);
  
  // Get process details
  const { data: process, isLoading: processLoading, error } = useQuery<Process>({
    queryKey: [`/api/processes/${parsedId}`],
  });
  
  // Get modality details
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
    enabled: !!process,
  });
  
  // Get source details
  const { data: sources } = useQuery<ResourceSource[]>({
    queryKey: ['/api/sources'],
    enabled: !!process,
  });
  
  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/status'],
  });

  // Get user details
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!process,
  });
  
  // Get current modality
  const modality = process && modalities 
    ? modalities.find(m => m.id === process.modalityId) 
    : undefined;
  
  // Get source
  const source = process && sources 
    ? sources.find(s => s.id === process.sourceId) 
    : undefined;
  
  // Get responsible user
  const responsible = process && users 
    ? users.find(u => u.id === process.responsibleId) 
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
        "Publicação do extrato do contrato"
      ];

      // Create steps in a single batch to avoid race conditions
      const createSteps = async () => {
        try {
          const promises = defaultSteps.map(stepName => 
            apiRequest('POST', `/api/processes/${parsedId}/steps`, {
              stepName,
              departmentId: process.currentDepartmentId,
              isCompleted: false,
            })
          );
          
          await Promise.all(promises);
          
          // Refresh steps after creation
          queryClient.invalidateQueries({ queryKey: [`/api/processes/${parsedId}/steps`] });
          
          toast({
            title: "Checklist criado",
            description: "As etapas do pregão eletrônico foram criadas automaticamente.",
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
    queryKey: ['/api/departments'],
    enabled: !!process,
  });

  // Find the next incomplete step
  const nextStep = steps?.find(step => !step.isCompleted);
  const stepDepartment = nextStep && Array.isArray(departments) 
    ? departments.find((d: any) => d.id === nextStep.departmentId)
    : undefined;

  // Function to get sector-specific steps
  const getSectorSteps = (userDepartment: string, modalityId: number) => {
    if (modalityId !== 1) return []; // Apenas para Pregão Eletrônico
    
    const stepsBySector: { [key: string]: { name: string; phase: string }[] } = {
      // TI - Setor Demandante (Fase de Iniciação)
      "TI": [
        { name: "Demanda identificada pela unidade requisitante", phase: "Iniciação" },
        { name: "Elaboração dos estudos técnicos preliminares", phase: "Iniciação" },
        { name: "Análise de viabilidade e adequação orçamentária", phase: "Iniciação" },
        { name: "Elaboração do termo de referência ou projeto básico", phase: "Iniciação" },
      ],
      
      // Licitações - Divisão de Licitação
      "Licitações": [
        { name: "Encaminhamento da demanda ao setor de licitações", phase: "Preparação" },
        { name: "Designação do pregoeiro e equipe de apoio", phase: "Preparação" },
        { name: "Elaboração do edital de licitação", phase: "Preparação" },
        { name: "Publicação do aviso de licitação", phase: "Execução" },
        { name: "Disponibilização do edital aos interessados", phase: "Execução" },
        { name: "Período para envio de propostas", phase: "Execução" },
        { name: "Sessão pública do pregão eletrônico", phase: "Execução" },
        { name: "Análise e classificação das propostas", phase: "Execução" },
        { name: "Habilitação dos licitantes", phase: "Execução" },
      ],
      
      // Jurídico - Assessoria Jurídica
      "Jurídico": [
        { name: "Análise jurídica do edital", phase: "Preparação" },
        { name: "Análise de recursos administrativos", phase: "Execução" },
        { name: "Elaboração da minuta do contrato", phase: "Finalização" },
      ],
      
      // Financeiro - Ordenador de Despesa
      "Financeiro": [
        { name: "Aprovação do termo de referência pela autoridade competente", phase: "Iniciação" },
        { name: "Aprovação do edital pela autoridade competente", phase: "Preparação" },
        { name: "Adjudicação e homologação", phase: "Finalização" },
        { name: "Empenho da despesa", phase: "Finalização" },
      ],
      
      // Administrativo - Gestão Contratual
      "Administrativo": [
        { name: "Assinatura do contrato", phase: "Finalização" },
        { name: "Publicação do extrato do contrato", phase: "Finalização" },
        { name: "Fiscalização e acompanhamento contratual", phase: "Finalização" },
      ]
    };
    
    return stepsBySector[userDepartment] || [];
  };
  
  // Handle edit process
  const handleEdit = () => {
    setLocation(`/processes/${id}/edit`);
  };

  // Handle step toggle
  const handleStepToggle = async (stepId: number, isCompleted: boolean) => {
    try {
      console.log(`Atualizando etapa ${stepId} para isCompleted: ${isCompleted}`);
      
      const response = await apiRequest('PATCH', `/api/processes/${parsedId}/steps/${stepId}`, {
        isCompleted,
      });

      if (response.ok) {
        console.log("Etapa atualizada com sucesso");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/processes/${parsedId}/steps`] });
        toast({
          title: isCompleted ? "Etapa concluída" : "Etapa desmarcada",
          description: isCompleted ? "A etapa foi marcada como concluída." : "A etapa foi desmarcada.",
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
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
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
  
  if (processLoading) {
    return <div className="p-8 text-center">Carregando detalhes do processo...</div>;
  }
  
  if (error || !process) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar processo</h2>
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
        
        <div className="flex space-x-2">
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
                  Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
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
                    <dt className="text-sm font-medium text-gray-500">PBDOC</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{process.pbdocNumber}</dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Descrição</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{process.description}</dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Modalidade</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{modality?.name || `Modalidade ${process.modalityId}`}</dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Fonte</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {source ? `Fonte ${source.code} - ${source.description}` : `Fonte ${process.sourceId}`}
                    </dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Responsável</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {responsible?.fullName || `Usuário ${process.responsibleId}`}
                      {process.responsibleSince && (
                        <div className="mt-1 text-xs text-blue-600 flex items-center">
                          <Clock className="h-3 w-3 mr-1" /> 
                          Responsável desde {format(new Date(process.responsibleSince), "dd/MM/yyyy", { locale: ptBR })} 
                          ({Math.ceil((new Date().getTime() - new Date(process.responsibleSince).getTime()) / (1000 * 60 * 60 * 24))} dias)
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
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      <span className={`status-badge status-badge-${process.status}`}>
                        {getProcessStatusLabel(process.status)}
                      </span>
                    </dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Prioridade</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      <span className={`priority-badge priority-badge-${process.priority}`}>
                        {getProcessPriorityLabel(process.priority)}
                      </span>
                    </dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Data de Criação</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {format(new Date(process.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </dd>
                  </div>
                  
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Última Atualização</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {format(new Date(process.updatedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </dd>
                  </div>
                  
                  {process.deadline && (
                  <div className="py-3 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Prazo de Entrega</dt>
                    <dd className="text-sm text-gray-900 col-span-2 flex items-center">
                      {format(new Date(process.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {new Date(process.deadline) < new Date() ? (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Atrasado
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {Math.ceil((new Date(process.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias restantes
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
                        <h4 className="font-medium text-gray-900 text-sm">{nextStep.stepName}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {stepDepartment?.name || 'Departamento não definido'}
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
                          Progresso: {steps?.filter(s => s.isCompleted).length || 0} de {steps?.length || 0}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${((steps?.filter(s => s.isCompleted).length || 0) / (steps?.length || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Sector-Specific Checklist */}
                      {currentUser && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Checklist do Setor {currentUser.department}
                          </h4>
                          
                          {/* Sector Steps */}
                          <div className="space-y-2">
                            {getSectorSteps(currentUser.department, process?.modalityId || 1).map((sectorStep, index) => {
                              const existingStep = steps?.find(s => s.stepName === sectorStep.name);
                              const isCompleted = existingStep?.isCompleted || false;
                              
                              return (
                                <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border border-gray-200">
                                  <button
                                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isCompleted 
                                        ? "bg-green-600 border-green-600 hover:bg-green-700" 
                                        : "border-blue-400 hover:border-green-400 bg-white hover:bg-green-50"
                                    }`}
                                    onClick={() => existingStep && handleStepToggle(existingStep.id, !isCompleted)}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    ) : (
                                      <span className="text-xs text-blue-600 font-medium">✓</span>
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {sectorStep.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Fase: {sectorStep.phase}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Current Step Action */}
                      {nextStep && (
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
                    </div>
                  </CardContent>
                </Card>
              )}
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
                Baseado na Lei nº 14.133/2021 - Nova Lei de Licitações e Contratos
              </p>
            </div>

            {/* Fase 1: Iniciação */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                FASE DE INICIAÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-blue-300">
                  <h4 className="font-medium text-gray-800">Setor Demandante</h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Documento de Formalização da Demanda (DFD)</li>
                    <li>• Estudo Técnico Preliminar (ETP)</li>
                    <li>• Mapa de Risco (MR)</li>
                    <li>• Termo de Referência (TR)</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-orange-300">
                  <h4 className="font-medium text-gray-800">Ordenador de Despesa</h4>
                  <p className="text-sm text-gray-600 mt-2">• Autorização (Prazo: 10 dias)</p>
                </div>
              </div>
            </div>

            {/* Fase 2: Preparação */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                FASE DE PREPARAÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-yellow-300">
                  <h4 className="font-medium text-gray-800">Divisão de Licitação</h4>
                  <p className="text-sm text-gray-600 mt-2">• Criar Processo no Órgão (Prazo: 2 dias)</p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-green-300">
                  <h4 className="font-medium text-gray-800">Núcleo de Pesquisa de Preços</h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Fazer Pesquisa de Preços (Prazo: 2 dias)</li>
                    <li>• Elaborar Mapa Comparativo (Prazo: 10 dias)</li>
                    <li>• Metodologia da Pesquisa (Prazo: 10 dias)</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-purple-300">
                  <h4 className="font-medium text-gray-800">Orçamento e Finanças</h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Consultar Disponibilidade Orçamentária (Prazo: 1 dia)</li>
                    <li>• Emitir Reserva Orçamentária (Prazo: 1 dia)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fase 3: Execução */}
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                FASE DE EXECUÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-red-300">
                  <h4 className="font-medium text-gray-800">Secretário SEAP</h4>
                  <p className="text-sm text-gray-600 mt-2">• Autorização Final</p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-green-300">
                  <h4 className="font-medium text-gray-800">Divisão de Licitação</h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Elaborar Edital e Anexos (Prazo: 10 dias)</li>
                    <li>• Consultar Comitê Gestor (Prazo: 2 dias)</li>
                    <li>• Publicar Edital</li>
                    <li>• Realizar Sessão Pública de Lances</li>
                    <li>• Análise de Documentação</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-blue-300">
                  <h4 className="font-medium text-gray-800">Assessoria Jurídica</h4>
                  <p className="text-sm text-gray-600 mt-2">• Elaboração de Nota Técnica (Prazo: 1 dia)</p>
                </div>
              </div>
            </div>

            {/* Fase 4: Finalização */}
            <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                FASE DE FINALIZAÇÃO
              </h3>
              <div className="grid gap-3">
                <div className="bg-white p-4 rounded border-l-2 border-purple-300">
                  <h4 className="font-medium text-gray-800">Divisão de Licitação</h4>
                  <p className="text-sm text-gray-600 mt-2">• Adjudicação e Homologação</p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-blue-300">
                  <h4 className="font-medium text-gray-800">Assessoria Jurídica</h4>
                  <p className="text-sm text-gray-600 mt-2">• Elaboração do Contrato</p>
                </div>
                <div className="bg-white p-4 rounded border-l-2 border-red-300">
                  <h4 className="font-medium text-gray-800">Secretário SEAP</h4>
                  <p className="text-sm text-gray-600 mt-2">• Assinatura do Contrato</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-800 mb-2">Observações Importantes:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Este fluxograma segue rigorosamente a Lei nº 14.133/2021</li>
                <li>• Os prazos indicados são obrigatórios conforme legislação</li>
                <li>• Cada fase deve ser concluída antes do início da próxima</li>
                <li>• A documentação de cada etapa deve ser arquivada no processo</li>
              </ul>
            </div>
          </div>
        </TabsContent>
        

      </Tabs>
    </div>
  );
};

export default ProcessDetail;
