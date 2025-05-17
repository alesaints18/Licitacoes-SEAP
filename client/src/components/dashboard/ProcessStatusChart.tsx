import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ProcessStatistics {
  total: number;
  completed: number;
  inProgress: number;
  canceled: number;
}

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

interface ProcessStatusChartProps {
  filters?: FilterState;
}

const ProcessStatusChart = ({ filters = {} }: ProcessStatusChartProps) => {
  const { data, isLoading, error } = useQuery<ProcessStatistics>({
    queryKey: ['/api/analytics/process-statistics', filters],
    queryFn: async ({ queryKey }) => {
      const [endpoint, queryFilters] = queryKey as [string, FilterState];
      
      // Construir string de parâmetros de consulta
      const params = new URLSearchParams();
      if (queryFilters.pbdoc) params.append('pbdocNumber', queryFilters.pbdoc);
      if (queryFilters.modality) params.append('modalityId', queryFilters.modality);
      if (queryFilters.responsible) {
        console.log("Adicionando responsibleId:", queryFilters.responsible, "tipo:", typeof queryFilters.responsible);
        params.append('responsibleId', queryFilters.responsible);
      }
      
      console.log("ProcessStatusChart - Filtros aplicados:", queryFilters);
      console.log("ProcessStatusChart - URL params:", params.toString());
      
      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao buscar estatísticas');
      }
      return response.json();
    },
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Status dos Processos</h2>
          <div className="p-4 h-64 flex items-center justify-center">
            <p>Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Status dos Processos</h2>
          <div className="p-4 h-64 flex items-center justify-center">
            <p className="text-red-500">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Transform data for chart
  const chartData = [
    { name: "Concluídos", value: data.completed, color: "#4CAF50" },
    { name: "Em Andamento", value: data.inProgress, color: "#FFC107" },
    { name: "Cancelados", value: data.canceled, color: "#D32F2F" },
  ].filter(item => item.value > 0); // Only include non-zero values
  
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Status dos Processos</h2>
        <div className="p-4 flex justify-center">
          <div className="relative w-64 h-64">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-medium text-gray-800">{data.total} Total</span>
            </div>
            
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} processos`, ""]}
                  labelFormatter={() => ""}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Concluídos ({data.completed})</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Em Andamento ({data.inProgress})</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Cancelados ({data.canceled})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessStatusChart;
