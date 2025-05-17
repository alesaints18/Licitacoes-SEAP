import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ResourceSource } from "@shared/schema";

interface SourceDistribution {
  sourceId: number;
  count: number;
}

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

interface ResourceDistributionChartProps {
  filters?: FilterState;
}

const ResourceDistributionChart = ({ filters = {} }: ResourceDistributionChartProps) => {
  // Get source distributions
  const { data: sourceData, isLoading: sourceLoading, error: sourceError } = useQuery<SourceDistribution[]>({
    queryKey: ['/api/analytics/processes-by-source', filters],
    queryFn: async ({ queryKey }) => {
      const [endpoint, queryFilters] = queryKey as [string, FilterState];
      
      // Construir string de parâmetros de consulta
      const params = new URLSearchParams();
      if (queryFilters.pbdoc) params.append('pbdocNumber', queryFilters.pbdoc);
      if (queryFilters.modality) params.append('modalityId', queryFilters.modality);
      if (queryFilters.responsible) params.append('responsibleId', queryFilters.responsible);
      
      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao buscar dados de processos por fonte');
      }
      return response.json();
    },
  });
  
  // Get resource sources (to get names)
  const { data: sources, isLoading: sourcesLoading } = useQuery<ResourceSource[]>({
    queryKey: ['/api/sources'],
  });
  
  const isLoading = sourceLoading || sourcesLoading;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Distribuição por Fonte de Recurso</h2>
          <div className="space-y-4 p-4 flex justify-center items-center h-64">
            <p>Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (sourceError || !sourceData || !sources) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Distribuição por Fonte de Recurso</h2>
          <div className="space-y-4 p-4 flex justify-center items-center h-64">
            <p className="text-red-500">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Combine data
  const chartData = sourceData.map(item => {
    const source = sources.find(s => s.id === item.sourceId);
    return {
      sourceId: item.sourceId,
      sourceName: source?.code || `Fonte ${item.sourceId}`,
      count: item.count
    };
  });
  
  // Calculate total
  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  
  // Add percentage
  const chartDataWithPercent = chartData.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
  }));
  
  // Sort by percentage (descending)
  chartDataWithPercent.sort((a, b) => b.percentage - a.percentage);
  
  // Define colors for the bars
  const colors = ["bg-blue-600", "bg-green-600", "bg-purple-600", "bg-yellow-600", "bg-red-600"];
  
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Distribuição por Fonte de Recurso</h2>
        <div className="space-y-4 p-4">
          {chartDataWithPercent.map((item, index) => (
            <div key={item.sourceId}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  Fonte {item.sourceName}
                </span>
                <span className="text-sm font-medium text-gray-700">{item.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`${colors[index % colors.length]} h-2.5 rounded-full`} 
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
          
          {chartDataWithPercent.length === 0 && (
            <div className="flex justify-center items-center h-32">
              <p className="text-gray-500">Nenhum dado disponível</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceDistributionChart;
