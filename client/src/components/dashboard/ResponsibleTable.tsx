import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

interface ResponsibleData {
  responsibleId: number;
  total: number;
  completed: number;
}

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

interface ResponsibleTableProps {
  filters?: FilterState;
}

const ResponsibleTable = ({ filters = {} }: ResponsibleTableProps) => {
  // Get process by responsible
  const { data: responsibleData, isLoading: dataLoading, error } = useQuery<ResponsibleData[]>({
    queryKey: ['/api/analytics/processes-by-responsible', filters],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Get users (to get names)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  const isLoading = dataLoading || usersLoading;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Responsáveis por Processos</h2>
          <div className="h-64 flex items-center justify-center">
            <p>Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !responsibleData || !users) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Responsáveis por Processos</h2>
          <div className="h-64 flex items-center justify-center">
            <p className="text-red-500">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Combine data
  const tableData = responsibleData.map(item => {
    const user = users.find(u => u.id === item.responsibleId);
    return {
      id: item.responsibleId,
      name: user?.fullName || `Usuário ${item.responsibleId}`,
      initials: user?.fullName
        ? user.fullName
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : "??",
      total: item.total,
      completed: item.completed,
      percentage: Math.round((item.completed / item.total) * 100)
    };
  });
  
  // Sort by percentage (descending)
  tableData.sort((a, b) => b.percentage - a.percentage);
  
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Responsáveis por Processos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header">
                  Responsável
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header">
                  Processos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header">
                  Concluídos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider dark-header">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                        {item.initials}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900 mr-2">{item.percentage}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${
                            item.percentage >= 80 
                              ? "bg-green-600" 
                              : item.percentage >= 60 
                              ? "bg-yellow-500" 
                              : "bg-red-500"
                          } h-2 rounded-full`} 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum dado disponível
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsibleTable;
