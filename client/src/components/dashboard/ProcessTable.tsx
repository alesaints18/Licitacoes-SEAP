import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Process, User, BiddingModality } from "@shared/schema";
import { Link } from "wouter";
import { Eye, Edit } from "lucide-react";
import { getProcessStatusLabel, getProcessStatusClass } from "@/lib/utils/process";
import { getQueryFn } from "@/lib/queryClient";

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

interface ProcessTableProps {
  filters?: FilterState;
}

const ProcessTable = ({ filters = {} }: ProcessTableProps) => {
  // Get processes (just the most recent ones)
  const { data: processes, isLoading, error } = useQuery<Process[]>({
    queryKey: ['/api/processes', filters],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get users for responsible names
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get modalities
  const { data: modalities } = useQuery({
    queryKey: ['/api/modalities'],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Processos Recentes</h2>
          <Link href="/processes">
            <a className="text-primary-600 hover:text-primary-800 text-sm font-medium">Ver Todos</a>
          </Link>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !processes) {
    return (
      <Card>
        <CardContent className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Processos Recentes</h2>
          <p className="text-red-500">Erro ao carregar dados</p>
        </CardContent>
      </Card>
    );
  }
  
  // Get only the 5 most recent processes
  const recentProcesses = [...processes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  
  return (
    <Card>
      <CardContent className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800">Processos Recentes</h2>
        <Link href="/processes">
          <a className="text-primary-600 hover:text-primary-800 text-sm font-medium">Ver Todos</a>
        </Link>
      </CardContent>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PBDOC
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modalidade
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responsável
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recentProcesses.map((process) => {
              const responsible = users?.find(u => u.id === process.responsibleId);
              const modality = modalities?.find(m => m.id === process.modalityId);
              
              return (
                <tr key={process.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {process.pbdocNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {process.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {modality?.name || `Modalidade ${process.modalityId}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {responsible?.fullName || `Usuário ${process.responsibleId}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`status-badge status-badge-${process.status}`}>
                      {getProcessStatusLabel(process.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link href={`/processes/${process.id}`}>
                      <a className="text-primary-600 hover:text-primary-900 mr-3">
                        <Eye className="h-4 w-4 inline-block" />
                      </a>
                    </Link>
                    <Link href={`/processes/${process.id}/edit`}>
                      <a className="text-gray-600 hover:text-gray-900">
                        <Edit className="h-4 w-4 inline-block" />
                      </a>
                    </Link>
                  </td>
                </tr>
              );
            })}
            
            {recentProcesses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum processo cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando <span className="font-medium">{recentProcesses.length}</span> de <span className="font-medium">{processes.length}</span> processos
        </div>
      </div>
    </Card>
  );
};

export default ProcessTable;
