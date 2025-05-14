import { useState } from "react";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import ProcessStatusChart from "@/components/dashboard/ProcessStatusChart";
import MonthlyProcessesChart from "@/components/dashboard/MonthlyProcessesChart";
import ResourceDistributionChart from "@/components/dashboard/ResourceDistributionChart";
import ResponsibleTable from "@/components/dashboard/ResponsibleTable";
import ProcessTable from "@/components/dashboard/ProcessTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { useQuery } from "@tanstack/react-query";

interface FilterState {
  pbdoc?: string;
  modality?: string;
  responsible?: string;
}

const Dashboard = () => {
  const [filters, setFilters] = useState<FilterState>({});
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/analytics/process-statistics'],
  });
  
  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    // In a real implementation, this would trigger filtered queries
    // Since we're using mock data, we're just updating the state
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Visão geral dos processos de licitação</p>
      </div>
      
      {/* Filter Controls */}
      <DashboardFilters onApplyFilters={handleApplyFilters} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <StatsCard
          title="Total de Processos"
          value={stats?.total || 0}
          icon={<FileText className="h-6 w-6" />}
          progress={{ current: stats?.total || 0, max: 200 }}
          color="blue"
        />
        
        <StatsCard
          title="Concluídos"
          value={stats?.completed || 0}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          change={{ value: 12, label: "+12% de aumento" }}
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
          change={{ value: -3, label: "-3% redução" }}
        />
      </div>
      
      {/* Charts - First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ProcessStatusChart />
        <MonthlyProcessesChart />
      </div>
      
      {/* Charts - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ResourceDistributionChart />
        <ResponsibleTable />
      </div>
      
      {/* Recent Processes Table */}
      <ProcessTable />
    </div>
  );
};

export default Dashboard;
