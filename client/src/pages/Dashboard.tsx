import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, XCircle, RefreshCw, Trophy, TrendingUp } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import ProcessStatusChart from "@/components/dashboard/ProcessStatusChart";
import MonthlyProcessesChart from "@/components/dashboard/MonthlyProcessesChart";
import ResourceDistributionChart from "@/components/dashboard/ResourceDistributionChart";

import ProcessTable from "@/components/dashboard/ProcessTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import MonthlyGoalSettings from "@/components/dashboard/MonthlyGoalSettings";
import { TemporalDistributionChart } from "@/components/dashboard/TemporalDistributionChart";
import { DepartmentRanking } from "@/components/dashboard/DepartmentRanking";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
  centralcompras?: string;
}

const Dashboard = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const [monthlyGoal, setMonthlyGoal] = useState<number>(200);

  // Verificar se o usuário é administrador
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/status"],
    queryFn: async () => {
      const response = await fetch("/api/auth/status");
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
  });

  const isAdmin = currentUser?.role === "admin";

  // Buscar a meta mensal configurada
  const { data: goalData } = useQuery({
    queryKey: ["/api/settings/monthly-goal"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/monthly-goal");
        if (response.ok) {
          const data = await response.json();
          return data.value;
        }
      } catch (error) {
        console.error("Erro ao buscar meta mensal:", error);
      }

      // Como fallback, usa o localStorage ou o valor padrão
      const storedGoal = localStorage.getItem("monthlyGoal");
      return storedGoal ? parseInt(storedGoal) : 200;
    },
  });

  // Atualizar a meta quando os dados forem carregados
  useEffect(() => {
    if (goalData) {
      setMonthlyGoal(goalData);
    }
  }, [goalData]);

  // Implementação customizada de consulta para pegar processos e executar filtragem no frontend
  const { data: processos } = useQuery({
    queryKey: ["/api/processes"],
    queryFn: async () => {
      const response = await fetch("/api/processes");
      if (!response.ok) {
        throw new Error("Falha ao buscar processos");
      }
      return response.json();
    },
  });

  // Função para filtrar os processos no client-side
  const filtrarProcessos = (processos: any[] = []) => {
    console.log("Filtrando processos client-side:", processos.length);
    console.log("Filtros aplicados:", filters);

    let processosFiltrados = [...processos];

    if (filters.pbdoc) {
      processosFiltrados = processosFiltrados.filter((p) =>
        p.pbdocNumber.toLowerCase().includes(filters.pbdoc!.toLowerCase()),
      );
    }

    if (filters.modality) {
      const modalityId = parseInt(filters.modality);
      processosFiltrados = processosFiltrados.filter(
        (p) => p.modalityId === modalityId,
      );
    }

    if (filters.responsible) {
      const responsibleId = parseInt(filters.responsible);
      console.log(
        `Filtrando responsibleId=${responsibleId}, tipo: ${typeof responsibleId}`,
      );
      processosFiltrados = processosFiltrados.filter((p) => {
        console.log(
          `Processo ${p.id}: ${p.responsibleId} === ${responsibleId} => ${p.responsibleId === responsibleId}`,
        );
        return p.responsibleId === responsibleId;
      });
    }
    
    // Filtro para Central de Compras
    if (filters.centralcompras) {
      console.log(`Filtrando Central de Compras: "${filters.centralcompras}"`);
      processosFiltrados = processosFiltrados.filter((p) => {
        console.log(`Verificando processo ${p.id}, Central de Compras: "${p.centralDeCompras}"`);
        return p.centralDeCompras && 
               p.centralDeCompras.toString().toLowerCase().includes(filters.centralcompras!.toLowerCase());
      });
      console.log(`Processos após filtro de Central de Compras: ${processosFiltrados.length}`);
    }

    console.log("Processos após filtragem:", processosFiltrados.length);
    return processosFiltrados;
  };

  // Filtrar processos e calcular estatísticas no client-side
  const processosFiltrados = processos ? filtrarProcessos(processos) : [];
  const stats = {
    total: processosFiltrados.length,
    completed: processosFiltrados.filter((p) => p.status === "completed")
      .length,
    inProgress: processosFiltrados.filter((p) => p.status === "in_progress")
      .length,
    canceled: processosFiltrados.filter((p) => p.status === "canceled").length,
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    console.log("Applying filters:", newFilters);
    setFilters(newFilters);
  };

  // Função para atualizar manualmente os dados do dashboard
  const { toast } = useToast();

  const refreshData = () => {
    // Invalidar todas as consultas para forçar a atualização
    queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
    queryClient.invalidateQueries({
      queryKey: ["/api/analytics/process-statistics"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/analytics/processes-by-source"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/analytics/processes-by-responsible"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/analytics/temporal-distribution"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/analytics/department-ranking"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/settings/monthly-goal"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/modalities"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sources"] });

    // Mostrar notificação de dados atualizados
    toast({
      title: "Dados atualizados",
      description: "Os dados do dashboard foram atualizados com sucesso.",
      duration: 3000,
    });
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">
            Visão geral dos processos de licitação
          </p>
        </div>

        {isAdmin && <MonthlyGoalSettings isAdmin={isAdmin} />}
      </div>

      {/* Filter Controls */}
      <DashboardFilters onApplyFilters={handleApplyFilters} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <StatsCard
          title="Total de Processos"
          value={stats?.total || 0}
          icon={<FileText className="h-6 w-6" />}
          progress={{ current: stats?.total || 0, max: monthlyGoal }}
          color="blue"
        />

        <StatsCard
          title="Concluídos"
          value={stats?.completed || 0}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          change={{ value: 12, label: "" }}
        />

        <StatsCard
          title="Em Andamento"
          value={stats?.inProgress || 0}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          change={{ value: 0, label: "Em processamento" }}
        />

        <StatsCard
          title="Cancelados"
          value={stats?.canceled || 0}
          icon={<XCircle className="h-6 w-6" />}
          color="red"
          change={{ value: -3, label: "" }}
        />
      </div>

      {/* Charts - First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ProcessStatusChart filters={filters} />
        <TemporalDistributionChart filters={filters} />
      </div>

      {/* Charts - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DepartmentRanking filters={filters} />
        <ResourceDistributionChart filters={filters} />
      </div>

      {/* Recent Processes Table */}
      <ProcessTable filters={filters} />
    </div>
  );
};

export default Dashboard;
