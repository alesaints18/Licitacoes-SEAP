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
    queryFn: getQueryFn(),
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
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-gray-600 min-w-[3rem]">
                  {getRankPosition(index)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {dept.departmentName}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {dept.total} total
                    </Badge>
                    {dept.inProgress > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-700">
                        <Clock className="h-3 w-3" />
                        {dept.inProgress} em andamento
                      </Badge>
                    )}
                    {dept.overdue > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dept.overdue} atrasados
                      </Badge>
                    )}
                    {dept.completed > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        {dept.completed} concluídos
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {dept.total}
                </div>
                <div className="text-sm text-gray-500">
                  {dept.completed > 0 && `${getPercentage(dept.completed, dept.total)}% concluído`}
                </div>
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