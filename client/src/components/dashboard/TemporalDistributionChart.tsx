import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getQueryFn } from "@/lib/queryClient";

interface TemporalDistributionData {
  period: string;
  inProgress: number;
  overdue: number;
  completed: number;
}

interface TemporalDistributionChartProps {
  filters: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  };
}

export function TemporalDistributionChart({ filters }: TemporalDistributionChartProps) {
  console.log('TemporalDistributionChart - Filtros aplicados:', filters);
  
  // Construir query params
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  const urlParams = queryParams.toString();
  console.log('TemporalDistributionChart - URL params:', urlParams);

  const { data: temporalData = [] } = useQuery<TemporalDistributionData[]>({
    queryKey: ['/api/analytics/temporal-distribution', urlParams],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Preparar dados para o gráfico
  const chartData = temporalData.map(item => ({
    period: item.period,
    'Em Andamento': item.inProgress,
    'Atrasados': item.overdue,
    'Concluídos': item.completed,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-600">Distribuição Temporal</CardTitle>
        <CardDescription>
          Evolução dos processos por período (em andamento, atrasados, concluídos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Em Andamento" 
              stroke="#F59E0B" 
              strokeWidth={3}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="Atrasados" 
              stroke="#EF4444" 
              strokeWidth={3}
              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="Concluídos" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="Cancelados" 
              stroke="#9CA3AF" 
              strokeWidth={3}
              dot={{ fill: '#9CA3AF', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}