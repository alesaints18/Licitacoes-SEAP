import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

interface DepartmentRankingData {
  departmentId: number;
  departmentName: string;
  total: number;
  inProgress: number;
  overdue: number;
  completed: number;
}

interface DepartmentRankingProps {
  filters: {
    pbdocNumber?: string;
    modalityId?: number;
    sourceId?: number;
    responsibleId?: number;
    status?: string;
  };
}

export function DepartmentRanking({ filters }: DepartmentRankingProps) {
  console.log('DepartmentRanking - Filtros aplicados:', filters);
  
  // Construir query params
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  const urlParams = queryParams.toString();
  console.log('DepartmentRanking - URL params:', urlParams);

  const { data: rankingData = [] } = useQuery<DepartmentRankingData[]>({
    queryKey: ['/api/analytics/department-ranking', urlParams],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const getRankPosition = (index: number) => {
    const positions = ['🥇', '🥈', '🥉'];
    return positions[index] || `${index + 1}º`;
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-600">
          <Trophy className="h-5 w-5" />
          Ranking de Departamentos
        </CardTitle>
        <CardDescription>
          Volume de processos por setor ordenado por quantidade total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rankingData.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nenhum dado disponível para os filtros aplicados
          </p>
        ) : (
          rankingData.slice(0, 10).map((dept, index) => (
            <div
              key={dept.departmentId}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl font-bold text-gray-600 min-w-[3rem] flex-shrink-0">
                  {getRankPosition(index)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {dept.departmentName}
                  </h3>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 ml-[3.75rem]">
                <Badge variant="outline" className="flex items-center gap-1 flex-shrink-0">
                  <TrendingUp className="h-3 w-3" />
                  {dept.total} total
                </Badge>
                {dept.inProgress > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {dept.inProgress} em andamento
                  </Badge>
                )}
                {dept.overdue > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {dept.overdue} atrasados
                  </Badge>
                )}
                {dept.completed > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-700 flex-shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    {dept.completed} concluídos
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
        
        {rankingData.length > 10 && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Mostrando top 10 de {rankingData.length} departamentos
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}