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
  
  // Transform data for chart - incluindo rascunhos como "Em Andamento"
  const rascunhosCount = data.total - data.completed - data.canceled;
  const chartData = [
    { name: "Concluídos", value: data.completed, color: "#10B981" },
    { name: "Em Andamento", value: rascunhosCount, color: "#3B82F6" },
    { name: "Cancelados", value: data.canceled, color: "#EF4444" },
  ];
  
  // Filtrar apenas dados com valores > 0 para mostrar no gráfico
  const displayData = chartData.filter(item => item.value > 0);
  
  // Se não há dados, mostrar placeholder
  if (displayData.length === 0) {
    displayData.push({ name: "Sem dados", value: 1, color: "#E5E7EB" });
  }
  
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
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayData.map((entry, index) => (
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
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 mt-8">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3 flex-shrink-0"></div>
            <div className="text-center sm:text-left">
              <div className="text-sm text-gray-600">Concluídos</div>
              <div className="text-xs text-gray-500">
                {data.completed} {data.total > 0 && `(${((data.completed / data.total) * 100).toFixed(1)}%)`}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
            <div className="text-center sm:text-left">
              <div className="text-sm text-gray-600">Em Andamento</div>
              <div className="text-xs text-gray-500">
                {rascunhosCount} {data.total > 0 && `(${((rascunhosCount / data.total) * 100).toFixed(1)}%)`}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
            <div className="text-center sm:text-left">
              <div className="text-sm text-gray-600">Cancelados</div>
              <div className="text-xs text-gray-500">
                {data.canceled} {data.total > 0 && `(${((data.canceled / data.total) * 100).toFixed(1)}%)`}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessStatusChart;
