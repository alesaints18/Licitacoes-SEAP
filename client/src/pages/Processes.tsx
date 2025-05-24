import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Process, BiddingModality, ResourceSource, User, Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PlusCircle, 
  FileText, 
  Search, 
  SendHorizonal, 
  Loader2,
  X
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { getProcessStatusLabel } from "@/lib/utils/process";
import { ColumnDef } from "@tanstack/react-table";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// Interface para o diálogo de transferência
interface TransferDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  processId: number;
  processName: string;
  onTransfer: (departmentId: number) => void;
  isPending: boolean;
}

// Componente do diálogo de transferência
const TransferDialog = ({ 
  isOpen, 
  onOpenChange, 
  processId, 
  processName,
  onTransfer,
  isPending
}: TransferDialogProps) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  
  // Buscar departamentos disponíveis
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  const handleTransfer = () => {
    if (!selectedDepartment) {
      toast({
        title: "Erro",
        description: "Selecione um departamento para transferir o processo",
        variant: "destructive"
      });
      return;
    }
    
    onTransfer(parseInt(selectedDepartment));
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transferir Processo</DialogTitle>
          <DialogDescription>
            Selecione o departamento para o qual deseja transferir o processo <strong>{processName}</strong>.
            <br /><br />
            <span className="text-yellow-600 font-medium">
              Atenção: Após a transferência, o processo não estará mais visível para você.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Select onValueChange={setSelectedDepartment} value={selectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o departamento destino" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={!selectedDepartment || isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>Transferir Processo</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Processes = () => {
  const [, setLocation] = useLocation();
  const [pbdocFilter, setPbdocFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  
  // Estado para controlar o diálogo de transferência
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  
  // Get all processes
  const { data: processes, isLoading: processesLoading } = useQuery<Process[]>({
    queryKey: ['/api/processes'],
  });
  
  // Get all modalities for filter
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ['/api/modalities'],
  });
  
  // Get all sources for filter
  const { data: sources } = useQuery<ResourceSource[]>({
    queryKey: ['/api/sources'],
  });
  
  // Get all users for filter
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Mutação para transferir processo
  const transferMutation = useMutation({
    mutationFn: async ({ processId, departmentId }: { processId: number; departmentId: number }) => {
      const response = await apiRequest(
        "POST", 
        `/api/processes/${processId}/transfer`, 
        { departmentId }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao transferir processo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setTransferDialogOpen(false);
      
      // Exibe mensagem de sucesso
      toast({
        title: "Processo transferido com sucesso",
        description: "O processo foi transferido para outro departamento e não estará mais visível.",
        variant: "default",
      });
      
      // Invalida cache para recarregar processos
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao transferir processo",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutação para excluir processo
  const deleteProcessMutation = useMutation({
    mutationFn: async (processId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/processes/${processId}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao excluir processo");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Processo excluído com sucesso",
        description: "O processo foi removido permanentemente.",
      });
      
      // Invalidar cache para recarregar processos
      queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir processo",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Função para abrir diálogo de transferência
  const handleTransferClick = (process: Process) => {
    setSelectedProcess(process);
    setTransferDialogOpen(true);
  };
  
  // Função para realizar transferência
  const handleTransfer = (departmentId: number) => {
    if (!selectedProcess) return;
    
    transferMutation.mutate({
      processId: selectedProcess.id,
      departmentId
    });
  };
  
  // Filter processes based on selected filters
  const filteredProcesses = processes?.filter(process => {
    let match = true;
    
    if (pbdocFilter && !process.pbdocNumber.toLowerCase().includes(pbdocFilter.toLowerCase())) {
      match = false;
    }
    
    if (modalityFilter && modalityFilter !== "all" && process.modalityId !== parseInt(modalityFilter)) {
      match = false;
    }
    
    if (statusFilter && statusFilter !== "all" && process.status !== statusFilter) {
      match = false;
    }
    
    if (sourceFilter && sourceFilter !== "all" && process.sourceId !== parseInt(sourceFilter)) {
      match = false;
    }
    
    if (responsibleFilter && responsibleFilter !== "all" && process.responsibleId !== parseInt(responsibleFilter)) {
      match = false;
    }
    
    return match;
  });
  
  const handleViewProcess = (id: number) => {
    setLocation(`/processes/${id}`);
  };

  const columns: ColumnDef<Process>[] = [
    {
      accessorKey: "pbdocNumber",
      header: "PBDOC",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("pbdocNumber")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => (
        <div className="max-w-[500px] truncate">{row.getValue("description")}</div>
      ),
    },
    {
      accessorKey: "modalityId",
      header: "Modalidade",
      cell: ({ row }) => {
        const modalityId = row.getValue("modalityId") as number;
        const modality = modalities?.find(m => m.id === modalityId);
        return modality?.name || `Modalidade ${modalityId}`;
      },
    },
    {
      accessorKey: "sourceId",
      header: "Fonte",
      cell: ({ row }) => {
        const sourceId = row.getValue("sourceId") as number;
        const source = sources?.find(s => s.id === sourceId);
        return source ? `Fonte ${source.code}` : `Fonte ${sourceId}`;
      },
    },
    {
      accessorKey: "responsibleId",
      header: "Responsável",
      cell: ({ row }) => {
        const responsibleId = row.getValue("responsibleId") as number;
        const user = users?.find(u => u.id === responsibleId);
        return user?.fullName || `Usuário ${responsibleId}`;
      },
    },
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        return (
          <span className={`priority-badge priority-badge-${priority}`}>
            {priority === "low" ? "Baixa" : priority === "medium" ? "Média" : "Alta"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <span className={`status-badge status-badge-${status}`}>
            {getProcessStatusLabel(status)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const process = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              title="Visualizar"
              onClick={() => handleViewProcess(process.id)}
            >
              <FileText className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Transferir"
              onClick={() => handleTransferClick(process)}
            >
              <SendHorizonal className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Excluir"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                if (window.confirm(`Tem certeza que deseja excluir o processo ${process.pbdocNumber}?`)) {
                  deleteProcessMutation.mutate(process.id);
                }
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Processos de Licitação</h1>
          <p className="text-gray-600">Gerencie todos os processos licitatórios</p>
        </div>
        <Link href="/processes/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Novo Processo
          </Button>
        </Link>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="pbdoc" className="block text-sm font-medium text-gray-700 mb-1">
                PBDOC
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="pbdoc"
                  placeholder="Buscar por PBDOC"
                  className="pl-10"
                  value={pbdocFilter}
                  onChange={(e) => setPbdocFilter(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="modality" className="block text-sm font-medium text-gray-700 mb-1">
                Modalidade
              </label>
              <Select value={modalityFilter} onValueChange={setModalityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {modalities?.map((modality) => (
                    <SelectItem key={modality.id} value={modality.id.toString()}>
                      {modality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                Fonte
              </label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {sources?.map((source) => (
                    <SelectItem key={source.id} value={source.id.toString()}>
                      Fonte {source.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="responsible" className="block text-sm font-medium text-gray-700 mb-1">
                Responsável
              </label>
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Process Table */}
      <Card>
        <CardContent className="p-0 sm:p-0">
          {processesLoading ? (
            <div className="p-8 text-center">Carregando processos...</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredProcesses || []}
            />
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Transferência */}
      {selectedProcess && (
        <TransferDialog
          isOpen={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          processId={selectedProcess.id}
          processName={selectedProcess.pbdocNumber}
          onTransfer={handleTransfer}
          isPending={transferMutation.isPending}
        />
      )}
    </div>
  );
};

export default Processes;
