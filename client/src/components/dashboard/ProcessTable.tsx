import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Process, User, BiddingModality, Department } from "@shared/schema";
import { Link } from "wouter";
import { Eye, Edit, SendHorizonal, Loader2 } from "lucide-react";
import {
  getProcessStatusLabel,
  getProcessStatusClass,
} from "@/lib/utils/process";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

interface ProcessTableProps {
  filters?: FilterState;
}

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
  isPending,
}: TransferDialogProps) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  // Buscar departamentos disponíveis
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleTransfer = () => {
    if (!selectedDepartment) {
      toast({
        title: "Erro",
        description: "Selecione um departamento para transferir o processo",
        variant: "destructive",
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
            Selecione o departamento para o qual deseja transferir o processo{" "}
            <strong>{processName}</strong>.
            <br />
            <br />
            <span className="text-yellow-600 font-medium">
              Atenção: Após a transferência, o processo não estará mais visível
              para você.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Select
              onValueChange={setSelectedDepartment}
              value={selectedDepartment}
            >
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedDepartment || isPending}
          >
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

const ProcessTable = ({ filters = {} }: ProcessTableProps) => {
  // Estado para controlar o diálogo de transferência
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  // Get all processes
  const {
    data: allProcesses,
    isLoading,
    error,
  } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Mutation para transferir processo
  const transferMutation = useMutation({
    mutationFn: async ({
      processId,
      departmentId,
    }: {
      processId: number;
      departmentId: number;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/processes/${processId}/transfer/${departmentId}`,
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao transferir processo");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Processo transferido com sucesso",
      });
      setTransferDialogOpen(false);
      setSelectedProcess(null);
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao transferir processo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrar processos no lado do cliente
  const processes = useMemo(() => {
    if (!allProcesses) return [];

    let filteredProcesses = [...allProcesses];

    if (filters?.pbdoc) {
      filteredProcesses = filteredProcesses.filter((p) =>
        p.pbdocNumber.toLowerCase().includes(filters.pbdoc!.toLowerCase()),
      );
    }

    if (filters?.modality) {
      const modalityId = parseInt(filters.modality);
      filteredProcesses = filteredProcesses.filter(
        (p) => p.modalityId === modalityId,
      );
    }

    if (filters?.responsible) {
      const responsibleId = parseInt(filters.responsible);
      console.log(
        `ProcessTable - Filtrando responsibleId=${responsibleId}, tipo: ${typeof responsibleId}`,
      );
      filteredProcesses = filteredProcesses.filter(
        (p) => p.responsibleId === responsibleId,
      );
    }

    console.log("Filtrando processos client-side:", allProcesses.length);
    console.log("Filtros aplicados:", filters);
    console.log("Processos após filtragem:", filteredProcesses.length);

    return filteredProcesses;
  }, [allProcesses, filters]);

  // Get users for responsible names
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Get modalities
  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ["/api/modalities"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Função para abrir o diálogo de transferência
  const handleOpenTransferDialog = (process: Process) => {
    setSelectedProcess(process);
    setTransferDialogOpen(true);
  };

  // Função para transferir o processo
  const handleTransferProcess = (departmentId: number) => {
    if (selectedProcess) {
      transferMutation.mutate({
        processId: selectedProcess.id,
        departmentId,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Processos</h2>
          <Link href="/processes">
            <a className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              Ver Todos
            </a>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (error || !processes) {
    return (
      <Card>
        <CardContent className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Processos</h2>
          <p className="text-red-500">Erro ao carregar dados</p>
        </CardContent>
      </Card>
    );
  }

  // Get only the 5 most recent processes
  const recentProcesses = [...processes]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <>
      <Card>
        <CardContent className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Processos</h2>
          <Link href="/processes">
            <a className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              Ver Todos
            </a>
          </Link>
        </CardContent>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header"
                >
                  PBDOC
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header"
                >
                  Objeto
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header"
                >
                  Modalidade
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header"
                >
                  Responsável
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header"
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentProcesses.map((process) => {
                const responsible = users?.find(
                  (user) => user.id === process.responsibleId,
                );
                const modality = modalities?.find(
                  (modality) => modality.id === process.modalityId,
                );

                return (
                  <tr key={process.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 process-cell">
                      {process.pbdocNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 process-cell">
                      {process.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 process-cell">
                      {modality?.name || `Modalidade ${process.modalityId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 process-cell">
                      {responsible?.fullName ||
                        `Usuário ${process.responsibleId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`status-badge status-badge-${process.status}`}
                      >
                        {getProcessStatusLabel(process.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 process-cell">
                      <Link href={`/processes/${process.id}`}>
                        <a
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4 inline-block" />
                        </a>
                      </Link>
                      <Link href={`/processes/${process.id}/edit`}>
                        <a
                          className="text-gray-900 hover:text-gray-900 mr-3"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4 inline-block" />
                        </a>
                      </Link>
                      <button
                        className="text-blue-600 hover:text-blue-900 border-none bg-transparent p-0 cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenTransferDialog(process);
                        }}
                        title="Transferir para outro departamento"
                      >
                        <SendHorizonal className="h-4 w-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {recentProcesses.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-900 process-cell"
                  >
                    Nenhum processo cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando{" "}
            <span className="font-medium">{recentProcesses.length}</span> de{" "}
            <span className="font-medium">{processes.length}</span> processos
          </div>
        </div>
      </Card>

      {/* Diálogo de transferência de processo */}
      {selectedProcess && (
        <TransferDialog
          isOpen={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          processId={selectedProcess.id}
          processName={selectedProcess.description}
          onTransfer={handleTransferProcess}
          isPending={transferMutation.isPending}
        />
      )}
    </>
  );
};

export default ProcessTable;
