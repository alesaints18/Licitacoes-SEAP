import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Process, BiddingModality, ResourceSource, User } from "@shared/schema";
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
import { PlusCircle, FileText, Search } from "lucide-react";
import { getProcessStatusLabel } from "@/lib/utils/process";
import { ColumnDef } from "@tanstack/react-table";

const Processes = () => {
  const [, setLocation] = useLocation();
  const [pbdocFilter, setPbdocFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  
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
  
  // Filter processes based on selected filters
  const filteredProcesses = processes?.filter(process => {
    let match = true;
    
    if (pbdocFilter && !process.pbdocNumber.toLowerCase().includes(pbdocFilter.toLowerCase())) {
      match = false;
    }
    
    if (modalityFilter && process.modalityId !== parseInt(modalityFilter)) {
      match = false;
    }
    
    if (statusFilter && process.status !== statusFilter) {
      match = false;
    }
    
    if (sourceFilter && process.sourceId !== parseInt(sourceFilter)) {
      match = false;
    }
    
    if (responsibleFilter && process.responsibleId !== parseInt(responsibleFilter)) {
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewProcess(process.id)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Visualizar
          </Button>
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
                  <SelectItem value="">Todas</SelectItem>
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
                  <SelectItem value="">Todos</SelectItem>
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
                  <SelectItem value="">Todas</SelectItem>
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
                  <SelectItem value="">Todos</SelectItem>
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
    </div>
  );
};

export default Processes;
