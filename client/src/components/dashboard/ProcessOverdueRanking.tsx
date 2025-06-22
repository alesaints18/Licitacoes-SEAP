import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Clock } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

interface DepartmentRankingData {
  departmentId: number;
  departmentName: string;
  total: number;
  inProgress: number;
  overdue: number;
  completed: number;
}

interface ProcessOverdueRankingProps {
  filters: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  };
}

export function ProcessOverdueRanking({ filters }: ProcessOverdueRankingProps) {
  // Adicionar filtro para processos atrasados
  const overdueFilters = {
    ...filters,
    status: 'overdue'
  };
  
  // Construir query params
  const queryParams = new URLSearchParams();
  Object.entries(overdueFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  const urlParams = queryParams.toString();

  const { data: rankingData = [] } = useQuery<DepartmentRankingData[]>({
    queryKey: ['/api/analytics/department-ranking', urlParams],
    queryFn: getQueryFn(),
  });

  // Filtrar apenas departamentos com processos atrasados
  const overdueRanking = rankingData
    .filter(dept => dept.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 5);

  const getOverduePercentage = (overdue: number, total: number) => {
    return total > 0 ? Math.round((overdue / total) * 100) : 0;
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Processos Atrasados por Setor
        </CardTitle>
        <CardDescription>
          Departamentos com maior concentração de processos atrasados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueRanking.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-green-600 font-medium">Nenhum processo atrasado</p>
            <p className="text-sm text-gray-500">Todos os processos estão dentro do prazo!</p>
          </div>
        ) : (
          overdueRanking.map((dept, index) => (
            <div
              key={dept.departmentId}
              className="flex items-center justify-between p-3 border border-red-100 rounded-lg bg-red-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                  <span className="text-sm font-bold text-red-600">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {dept.departmentName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="destructive" className="text-xs">
                      {dept.overdue} atrasados
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {dept.total} total
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-red-600">
                  {getOverduePercentage(dept.overdue, dept.total)}%
                </div>
                <div className="text-xs text-gray-500">
                  atraso
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}