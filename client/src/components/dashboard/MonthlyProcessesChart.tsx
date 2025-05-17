import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getQueryFn } from "@/lib/queryClient";
import { useMemo } from "react";
import { Process } from "@shared/schema";

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
  // Obter todos os processos
  const { data: processos, isLoading: loadingProcessos, error: processosError } = useQuery<Process[]>({
    queryKey: ['/api/processes'],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Calcular dados por mês aplicando filtros no frontend
  const { data, isLoading, error } = useMemo(() => {
    if (loadingProcessos) return { data: undefined, isLoading: true, error: undefined };
    if (processosError) return { data: undefined, isLoading: false, error: processosError };
    if (!processos) return { data: undefined, isLoading: false, error: undefined };
    
    // Filtrar processos
    let processosFiltrados = [...processos];
    
    if (filters?.pbdoc) {
      processosFiltrados = processosFiltrados.filter(p => 
        p.pbdocNumber.toLowerCase().includes(filters.pbdoc!.toLowerCase())
      );
    }
    
    if (filters?.modality) {
      const modalityId = parseInt(filters.modality);
      processosFiltrados = processosFiltrados.filter(p => p.modalityId === modalityId);
    }
    
    if (filters?.responsible) {
      const responsibleId = parseInt(filters.responsible);
      console.log(`MonthlyChart - Filtrando responsibleId=${responsibleId}, processos antes: ${processosFiltrados.length}`);
      processosFiltrados = processosFiltrados.filter(p => {
        console.log(`Processo ${p.id}: responsibleId=${p.responsibleId} === ${responsibleId} => ${p.responsibleId === responsibleId}`);
        return p.responsibleId === responsibleId;
      });
      console.log(`MonthlyChart - Após filtro: ${processosFiltrados.length} processos`);
    }
    
    // Agrupar por mês
    const processosPorMes = new Map<number, number>();
    for (let i = 0; i < 12; i++) {
      processosPorMes.set(i, 0);
    }
    
    processosFiltrados.forEach(processo => {
      const mes = new Date(processo.createdAt).getMonth();
      processosPorMes.set(mes, (processosPorMes.get(mes) || 0) + 1);
    });
    
    const monthlyData: MonthlyData[] = Array.from(processosPorMes.entries()).map(([month, count]) => ({
      month,
      count
    }));
    
    return { data: monthlyData, isLoading: false, error: undefined };
  }, [processos, loadingProcessos, processosError, filters]);
  
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
