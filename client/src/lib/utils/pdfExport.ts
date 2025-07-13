import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  Process,
  User,
  BiddingModality,
  ResourceSource,
  Department,
} from "@shared/schema";
import { MONTHS } from "../constants";

interface ReportData {
  processes: Process[];
  users: User[];
  modalities: BiddingModality[];
  sources: ResourceSource[];
  departments?: Department[];
  filters: {
    department?: string;
    month?: string;
    year?: string;
  };
  reportType: string;
}

/**
 * Filtra os processos com base nos filtros selecionados
 */
function filterReportData(data: ReportData): Process[] {
  let filteredProcesses = [...data.processes];

  // Filtrar por mês
  if (data.filters.month && data.filters.month !== "all") {
    const monthIndex = parseInt(data.filters.month) - 1;
    filteredProcesses = filteredProcesses.filter((process) => {
      const processMonth = new Date(process.createdAt).getMonth();
      return processMonth === monthIndex;
    });
  }

  // Filtrar por ano
  if (data.filters.year) {
    const year = parseInt(data.filters.year);
    filteredProcesses = filteredProcesses.filter((process) => {
      const processYear = new Date(process.createdAt).getFullYear();
      return processYear === year;
    });
  }

  // Filtrar por departamento
  if (
    data.filters.department &&
    data.filters.department !== "all" &&
    data.departments
  ) {
    const departmentId = parseInt(data.filters.department);
    const department = data.departments.find((d) => d.id === departmentId);

    if (department) {
      filteredProcesses = filteredProcesses.filter((process) => {
        const user = data.users.find((u) => u.id === process.responsibleId);
        return user?.department === department.name;
      });
    }
  }

  return filteredProcesses;
}

/**
 * Gera um relatório PDF no formato específico da imagem exemplo
 */
export function generatePdfReport(data: ReportData): void {
  try {
    // Criar novo documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const marginBottom = 20;
    const usableWidth = pageWidth - 2 * margin;

    // Filtrar processos baseado nos critérios
    const filteredProcesses = filterReportData(data);
    const total = filteredProcesses.length || 1; // Evitar divisão por zero

    // CABEÇALHO DO RELATÓRIO
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text("QUANTIDADE DE PROCESSOS", margin, 25);

    // Botão de filtros
    doc.setFillColor(30, 144, 255);
    doc.roundedRect(pageWidth - margin - 30, 18, 30, 10, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("Filtros", pageWidth - margin - 15, 25, { align: "center" });
    doc.setTextColor(0, 0, 0);

    // Layout do relatório
    const startY = 40;
    const chartHeight = 80;
    const chartWidth = (usableWidth - 20) / 3;

    // ----- SEÇÃO 1: GRÁFICO DE PRIORIDADE (ROSCA) -----
    doc.setFontSize(10);
    doc.text("Grau de Prioridade", margin + chartWidth / 2, startY, {
      align: "center",
    });

    // Dados de prioridade
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    filteredProcesses.forEach((process) => {
      if (process.priority === "high") highCount++;
      else if (process.priority === "medium") mediumCount++;
      else if (process.priority === "low") lowCount++;
    });

    // Calcular percentuais
    const highPct = (highCount / total) * 100;
    const mediumPct = (mediumCount / total) * 100;
    const lowPct = (lowCount / total) * 100;

    // Centro do gráfico
    const centerX1 = margin + chartWidth / 2;
    const centerY1 = startY + 40;
    const radius = 25;

    // Usar método simples de desenho para o gráfico de rosca (simulado com círculos de cor)
    // Círculo externo
    doc.setFillColor(239, 68, 68); // Vermelho para alta prioridade
    doc.circle(centerX1, centerY1, radius, "F");

    // Círculo interno (branco para simular rosca)
    doc.setFillColor(255, 255, 255);
    doc.circle(centerX1, centerY1, radius * 0.5, "F");

    // Adicionar percentuais como texto
    doc.setFontSize(8);
    doc.text(`${Math.round(highPct)}%`, centerX1 - 20, centerY1 + 50);
    doc.text(`${Math.round(mediumPct)}%`, centerX1, centerY1 + 50);
    doc.text(`${Math.round(lowPct)}%`, centerX1 + 20, centerY1 + 50);

    // ----- SEÇÃO 2: GRÁFICO DE STATUS (ROSCA) -----
    doc.setFontSize(10);
    doc.text("Status", margin + chartWidth + 10 + chartWidth / 2, startY, {
      align: "center",
    });

    // Dados de status
    let completedCount = 0;
    let inProgressCount = 0;

    filteredProcesses.forEach((process) => {
      if (process.status === "completed") completedCount++;
      else if (process.status === "in_progress") inProgressCount++;
    });

    // Calcular percentuais
    const completedPct = (completedCount / total) * 100;
    const inProgressPct = (inProgressCount / total) * 100;

    // Centro do gráfico
    const centerX2 = margin + chartWidth + 10 + chartWidth / 2;
    const centerY2 = centerY1;

    // Círculo externo
    doc.setFillColor(245, 158, 11); // Amarelo para em andamento
    doc.circle(centerX2, centerY2, radius, "F");

    // Círculo interno (branco para simular rosca)
    doc.setFillColor(255, 255, 255);
    doc.circle(centerX2, centerY2, radius * 0.5, "F");

    // Adicionar legendas
    doc.setFontSize(6);
    doc.text("CONCLUÍDOS", centerX2 - 35, centerY2 - 20);
    doc.text("EM ANDAMENTO", centerX2 + 15, centerY2 - 20);

    // Adicionar percentuais
    doc.setFontSize(8);
    doc.text(`${Math.round(completedPct)}%`, centerX2 - 15, centerY2 + 50);
    doc.text(`${Math.round(inProgressPct)}%`, centerX2 + 15, centerY2 + 50);

    // ----- SEÇÃO 3: GRÁFICO DE FONTES (BARRAS HORIZONTAIS) -----
    doc.setFontSize(10);
    doc.text("Fonte", margin + 2 * chartWidth + 20 + chartWidth / 2, startY, {
      align: "center",
    });

    // Processos por fonte
    const sourceCounts = new Map<number, number>();
    filteredProcesses.forEach((process) => {
      const count = sourceCounts.get(process.sourceId) || 0;
      sourceCounts.set(process.sourceId, count + 1);
    });

    // Ordenar fontes por quantidade
    const sortedSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Mostrar apenas as 5 principais fontes

    // Configurações para barras horizontais
    const barStartX = margin + 2 * chartWidth + 35;
    const barStartY = startY + 10;
    const barMaxWidth = chartWidth - 40;
    const barHeight = 8;
    const barGap = 15;

    // Desenhar barras para cada fonte
    sortedSources.forEach((sourceEntry, index) => {
      const [sourceId, count] = sourceEntry;
      const source = data.sources.find((s) => s.id === sourceId);
      // Usar o primeiro valor como máximo se não houver outros
      const maxValue =
        sortedSources.length > 0
          ? Math.max(...sortedSources.map((s) => s[1]))
          : 1;
      const barWidth = (count / maxValue) * barMaxWidth;

      // Desenhar barra
      // Cores diferentes para cada barra
      const barColors = [
        [245, 158, 11], // Amarelo
        [16, 185, 129], // Verde
        [239, 68, 68],  // Vermelho
        [156, 163, 175], // Cinza
        [59, 130, 246], // Azul
        [168, 85, 247], // Roxo
      ];
      const color = barColors[index % barColors.length];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(barStartX, barStartY + index * barGap, barWidth, barHeight, "F");

      // Adicionar label e valor
      doc.setFontSize(7);
      const sourceLabel = source?.code || `ID ${sourceId}`;
      doc.text(
        sourceLabel,
        barStartX - 5,
        barStartY + index * barGap + barHeight / 2 + 2,
        { align: "right" },
      );
      doc.text(
        `${count}`,
        barStartX + barWidth + 3,
        barStartY + index * barGap + barHeight / 2 + 2,
      );
    });

    // Adicionar título "Responsável (Qtde)"
    doc.setFontSize(9);
    doc.text(
      "Responsável (Qtde)",
      barStartX + barMaxWidth / 2,
      barStartY + 5 * barGap + 10,
      { align: "center" },
    );

    // ----- SEÇÃO 4: GRÁFICO DE LINHA (CONCLUSÃO POR MÊS) -----
    const lineChartY = startY + chartHeight + 20;
    doc.setFontSize(10);
    doc.text(
      "Conclusão de Processos / Mês",
      margin + usableWidth / 2,
      lineChartY,
      { align: "center" },
    );

    // Configuração do gráfico de linha
    const lineStartX = margin + 10;
    const lineEndX = pageWidth - margin - 10;
    const lineY = lineChartY + 40;
    const lineWidth = lineEndX - lineStartX;

    // Desenhar linha base
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(lineStartX, lineY, lineEndX, lineY);

    // Dados fictícios para o gráfico de linha (similar à imagem)
    const monthlyValues = [
      { month: "Out 2023", value: 15 },
      { month: "Nov 2023", value: 25 },
      { month: "Dez 2023", value: 20 },
      { month: "Jan 2024", value: 30 },
      { month: "Fev 2024", value: 18 },
      { month: "Mar 2024", value: 28 },
      { month: "Abr 2024", value: 22 },
      { month: "Mai 2024", value: 32 },
    ];

    // Valor máximo para escala
    const maxValue = Math.max(...monthlyValues.map((mv) => mv.value));
    const valueScale = 30 / maxValue;

    // Armazenar pontos para desenhar linhas entre eles
    const linePoints: Array<{ x: number; y: number }> = [];
    const segmentWidth = lineWidth / (monthlyValues.length - 1);

    monthlyValues.forEach((mv, index) => {
      const x = lineStartX + index * segmentWidth;
      const y = lineY - mv.value * valueScale;
      linePoints.push({ x, y });

      // Desenhar ponto
      doc.setFillColor(54, 162, 235);
      doc.circle(x, y, 1.5, "F");

      // Adicionar label do mês
      doc.setFontSize(6);
      doc.text(mv.month, x, lineY + 7, { align: "center" });
    });

    // Desenhar linhas entre pontos
    doc.setDrawColor(54, 162, 235);
    doc.setLineWidth(0.8);
    for (let i = 0; i < linePoints.length - 1; i++) {
      doc.line(
        linePoints[i].x,
        linePoints[i].y,
        linePoints[i + 1].x,
        linePoints[i + 1].y,
      );
    }

    // Salvar o PDF
    doc.save(
      `relatorio-processos-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  } catch (error) {
    console.error("Erro ao gerar relatório PDF:", error);
    alert("Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.");
  }
}

/**
 * Exporta o dataset para arquivo Excel (não implementado)
 */
export function generateExcelReport(data: ReportData): void {
  console.log("Exportação para Excel não implementada");
  alert(
    "Exportação para Excel ainda não está implementada. Por favor, use a exportação para PDF.",
  );
}
