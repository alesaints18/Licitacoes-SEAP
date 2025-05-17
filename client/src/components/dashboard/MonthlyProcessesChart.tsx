import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getQueryFn } from "@/lib/queryClient";

interface MonthlyData {
  month: number;
  count: number;
}

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

interface MonthlyProcessesChartProps {
  filters?: FilterState;
}

const MonthlyProcessesChart = ({ filters = {} }: MonthlyProcessesChartProps) => {
  const { data, isLoading, error } = useQuery<MonthlyData[]>({
    queryKey: ['/api/analytics/processes-by-month', filters],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Processos por Mês</h2>
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
          <h2 className="text-lg font-medium text-gray-800 mb-4">Processos por Mês</h2>
          <div className="p-4 h-64 flex items-center justify-center">
            <p className="text-red-500">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Map month numbers to names
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  // Prepare data for chart
  const chartData = data.map(item => ({
    month: monthNames[item.month],
    count: item.count
  }));
  
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Processos por Mês</h2>
        <div className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(value) => [`${value} processos`, "Quantidade"]}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Bar dataKey="count" fill="#0066cc" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyProcessesChart;
