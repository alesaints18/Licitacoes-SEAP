import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Process, BiddingModality, ResourceSource, User } from "@shared/schema";
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
  
  // Handle edit process
  const handleEdit = () => {
    setLocation(`/processes/${id}/edit`);
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
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <dd className="text-sm text-gray-900 col-span-2">{responsible?.fullName || `Usuário ${process.responsibleId}`}</dd>
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
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="flow">
          <BiddingFlowchart selectedModalityId={process.modalityId} />
        </TabsContent>
        
        <TabsContent value="checklist">
          <StepChecklist processId={process.id} modalityId={process.modalityId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProcessDetail;
