import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, File, FileSpreadsheet } from "lucide-react";
import {
  Process,
  User,
  BiddingModality,
  ResourceSource,
  Department,
} from "@shared/schema";
import {
  generateExcelReport,
  generatePdfReport,
} from "@/lib/utils/exactReportExport";
import { generateTimelinePdfReport } from "@/lib/utils/timelineExport";
import { generateModernPdf } from "@/lib/utils/modernPdfGenerator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const Reports = () => {
  const [reportType, setReportType] = useState("processes");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [centralDeComprasFilter, setCentralDeComprasFilter] = useState("");

  const { data: processes } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: modalities } = useQuery<BiddingModality[]>({
    queryKey: ["/api/modalities"],
  });

  const { data: sources } = useQuery<ResourceSource[]>({
    queryKey: ["/api/sources"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Cores padronizadas para gráficos - seguindo o mesmo padrão do dashboard
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
  
  // Cores específicas para status dos processos (seguindo padrão dos gráficos do dashboard)
  const STATUS_COLORS = {
    "Em Andamento": "#F59E0B",    // amarelo
    "Concluído": "#10B981",       // verde
    "Cancelado": "#9CA3AF",       // cinza
    "Atrasado": "#EF4444"         // vermelho
  };

  // Filter processes based on filters
  const getFilteredProcesses = () => {
    if (!processes) return [];

    return processes.filter((process) => {
      // Filter by Central de Compras
      if (centralDeComprasFilter && process.centralDeCompras) {
        if (
          !process.centralDeCompras
            .toLowerCase()
            .includes(centralDeComprasFilter.toLowerCase())
        ) {
          return false;
        }
      }

      // Filter by department
      if (selectedDepartment && selectedDepartment !== "all") {
        if (process.currentDepartmentId !== parseInt(selectedDepartment)) {
          return false;
        }
      }

      // Filter by month and year
      if (selectedMonth && selectedMonth !== "all") {
        const processDate = new Date(process.createdAt);
        if (processDate.getMonth() + 1 !== parseInt(selectedMonth)) {
          return false;
        }
      }

      if (selectedYear && selectedYear !== "all") {
        const processDate = new Date(process.createdAt);
        if (processDate.getFullYear() !== parseInt(selectedYear)) {
          return false;
        }
      }

      return true;
    });
  };

  // Process data for charts
  const getProcessStatusData = () => {
    const filteredProcesses = getFilteredProcesses();
    if (!filteredProcesses.length) return [];

    const statusCounts = {
      draft: 0,
      in_progress: 0,
      completed: 0,
      canceled: 0,
    };

    filteredProcesses.forEach((process) => {
      statusCounts[process.status as keyof typeof statusCounts]++;
    });

    // Calcular processos atrasados
    const now = new Date();
    const overdueCount = filteredProcesses.filter(p => 
      p.status === "overdue" || 
      (p.status !== "completed" && p.status !== "canceled" && p.deadline && new Date(p.deadline) < now)
    ).length;
    
    return [
      { name: "Em Andamento", value: statusCounts.in_progress },
      { name: "Atrasado", value: overdueCount },
      { name: "Concluído", value: statusCounts.completed },
      { name: "Cancelado", value: statusCounts.canceled },
    ];
  };

  const getProcessModalityData = () => {
    const filteredProcesses = getFilteredProcesses();
    if (!filteredProcesses.length || !modalities) return [];

    const modalityCounts = new Map<number, number>();

    filteredProcesses.forEach((process) => {
      const count = modalityCounts.get(process.modalityId) || 0;
      modalityCounts.set(process.modalityId, count + 1);
    });

    return Array.from(modalityCounts.entries()).map(([modalityId, count]) => {
      const modality = modalities.find((m) => m.id === modalityId);
      return {
        name: modality?.name || `Modalidade ${modalityId}`,
        value: count,
      };
    });
  };

  const getProcessSourceData = () => {
    const filteredProcesses = getFilteredProcesses();
    if (!filteredProcesses.length || !sources) return [];

    const sourceCounts = new Map<number, number>();

    filteredProcesses.forEach((process) => {
      const count = sourceCounts.get(process.sourceId) || 0;
      sourceCounts.set(process.sourceId, count + 1);
    });

    return Array.from(sourceCounts.entries()).map(([sourceId, count]) => {
      const source = sources.find((s) => s.id === sourceId);
      return {
        name: source ? `Fonte ${source.code}` : `Fonte ${sourceId}`,
        value: count,
      };
    });
  };

  const getUserPerformanceData = () => {
    if (!processes || !users) return [];

    const userPerformance = new Map<
      number,
      { total: number; completed: number }
    >();

    users.forEach((user) => {
      userPerformance.set(user.id, { total: 0, completed: 0 });
    });

    processes.forEach((process) => {
      const performance = userPerformance.get(process.responsibleId) || {
        total: 0,
        completed: 0,
      };
      performance.total++;

      if (process.status === "completed") {
        performance.completed++;
      }

      userPerformance.set(process.responsibleId, performance);
    });

    return Array.from(userPerformance.entries())
      .filter(([, performance]) => performance.total > 0)
      .map(([userId, performance]) => {
        const user = users.find((u) => u.id === userId);
        return {
          name: user?.fullName || `Usuário ${userId}`,
          total: performance.total,
          completed: performance.completed,
          percentage: (performance.completed / performance.total) * 100,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  };

  const prepareReportData = () => {
    if (!processes || !users || !modalities || !sources) return null;

    return {
      processes,
      users,
      modalities,
      sources,
      departments,
      filters: {
        department: selectedDepartment,
        month: selectedMonth,
        year: selectedYear,
      },
      reportType,
    };
  };

  const generateReport = (format: "pdf" | "excel") => {
    const reportData = prepareReportData();
    if (!reportData) return;

    if (format === "pdf") {
      generateTimelinePdfReport(reportData);
    } else {
      generateExcelReport(reportData);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Relatórios</h1>
        <p className="text-gray-600">
          Visualize e exporte relatórios do sistema
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Relatório
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processes">Processos</SelectItem>
                  <SelectItem value="users">Usuários</SelectItem>
                  <SelectItem value="departments">Setores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Central de Compras
              </label>
              <div className="relative">
                <Input
                  placeholder="Número Central de Compras"
                  value={centralDeComprasFilter}
                  onChange={(e) => setCentralDeComprasFilter(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setor
              </label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => generateReport("excel")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button
              onClick={() => {
                const data = prepareReportData();
                if (!data) return;
                generateModernPdf(data);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="graphs">
        <TabsList className="mb-6">
          <TabsTrigger value="graphs">Gráficos</TabsTrigger>
          <TabsTrigger value="tables">Tabelas</TabsTrigger>
        </TabsList>

        <TabsContent value="graphs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Processos por Status</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getProcessStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => {
                        // Só mostra label se tem valor > 0
                        return value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : null;
                      }}
                      labelStyle={{
                        fontSize: '11px',
                        fontWeight: 'normal'
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getProcessStatusData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Modality Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Processos por Modalidade</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getProcessModalityData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Quantidade" fill="#0066cc" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Source Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Processos por Fonte</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getProcessSourceData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Quantidade" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por Usuário</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getUserPerformanceData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#8884d8" />
                    <Bar dataKey="completed" name="Concluídos" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>
                {reportType === "processes" && "Relatório de Processos"}
                {reportType === "users" && "Relatório de Usuários"}
                {reportType === "departments" && "Relatório de Setores"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Process Report Table */}
              {reportType === "processes" && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          PBDOC
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Descrição
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Modalidade
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Responsável
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {processes?.map((process) => {
                        const modality = modalities?.find(
                          (m) => m.id === process.modalityId,
                        );
                        const user = users?.find(
                          (u) => u.id === process.responsibleId,
                        );

                        return (
                          <tr key={process.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {process.pbdocNumber}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {process.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {modality?.name ||
                                `Modalidade ${process.modalityId}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user?.fullName ||
                                `Usuário ${process.responsibleId}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`status-badge status-badge-${process.status}`}
                              >
                                {process.status === "draft"
                                  ? "Rascunho"
                                  : process.status === "in_progress"
                                    ? "Em Andamento"
                                    : process.status === "completed"
                                      ? "Concluído"
                                      : "Cancelado"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* User Report Table */}
              {reportType === "users" && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Nome
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Setor
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Processos Total
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Concluídos
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Taxa de Conclusão
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getUserPerformanceData().map((user) => (
                        <tr key={user.name}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {users?.find((u) => u.fullName === user.name)
                              ?.department || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.total}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.completed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900 mr-2">
                                {Math.round(user.percentage)}%
                              </span>
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`${
                                    user.percentage >= 80
                                      ? "bg-green-600"
                                      : user.percentage >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  } h-2 rounded-full`}
                                  style={{ width: `${user.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Department Report Table */}
              {reportType === "departments" && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Setor
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Responsável
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Usuários
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Processos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departments?.map((department) => {
                        const departmentUsers =
                          users?.filter(
                            (u) => u.department === department.name,
                          ) || [];
                        const departmentProcesses =
                          processes?.filter((p) => {
                            const responsibleUser = users?.find(
                              (u) => u.id === p.responsibleId,
                            );
                            return (
                              responsibleUser?.department === department.name
                            );
                          }) || [];

                        return (
                          <tr key={department.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {department.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {departmentUsers.find((u) => u.role === "admin")
                                ?.fullName || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {departmentUsers.length}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {departmentProcesses.length}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
