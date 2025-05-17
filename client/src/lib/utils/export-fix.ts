import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";
import { MONTHS } from '../constants';
import { getProcessStatusLabel, getProcessPriorityLabel } from './process';
import autoTable from 'jspdf-autotable';

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
 * Desenha um segmento de gráfico de rosca (donut chart)
 */
function drawDonutSegment(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): void {
  // Converter ângulos para radianos
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  // Número de pontos para desenhar o arco (mais pontos = mais suave)
  const numPoints = Math.ceil((endAngle - startAngle) / 5);
  
  // Coleção de pontos para o polígono
  const points: [number, number][] = [];
  
  // Adicionar pontos do arco externo
  for (let i = 0; i <= numPoints; i++) {
    const angle = startRad + (i / numPoints) * (endRad - startRad);
    const x = centerX + outerRadius * Math.cos(angle);
    const y = centerY + outerRadius * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Adicionar pontos do arco interno (em ordem reversa)
  for (let i = numPoints; i >= 0; i--) {
    const angle = startRad + (i / numPoints) * (endRad - startRad);
    const x = centerX + innerRadius * Math.cos(angle);
    const y = centerY + innerRadius * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Desenhar o polígono preenchido
  doc.setFillColor(doc.getFillColor());
  doc.polygon(points, 'F');
}

/**
 * Filtra os processos com base nos filtros selecionados
 */
function filterReportData(data: ReportData): Process[] {
  let filteredProcesses = [...data.processes];
  
  // Filtrar por mês
  if (data.filters.month && data.filters.month !== "all") {
    const monthIndex = parseInt(data.filters.month) - 1;
    filteredProcesses = filteredProcesses.filter(process => {
      const processMonth = new Date(process.createdAt).getMonth();
      return processMonth === monthIndex;
    });
  }
  
  // Filtrar por ano
  if (data.filters.year) {
    const year = parseInt(data.filters.year);
    filteredProcesses = filteredProcesses.filter(process => {
      const processYear = new Date(process.createdAt).getFullYear();
      return processYear === year;
    });
  }
  
  // Filtrar por departamento
  if (data.filters.department && data.filters.department !== "all" && data.departments) {
    const departmentId = parseInt(data.filters.department);
    const department = data.departments.find(d => d.id === departmentId);
    
    if (department) {
      filteredProcesses = filteredProcesses.filter(process => {
        const user = data.users.find(u => u.id === process.responsibleId);
        return user?.department === department.name;
      });
    }
  }
  
  return filteredProcesses;
}

/**
 * Gera um relatório PDF com gráficos e tabelas
 * Formato baseado no exemplo fornecido
 */
export function generatePdfReport(data: ReportData): void {
  // Criar novo documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - (2 * margin);
  
  // Cabeçalho com título
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102); // Azul institucional
  doc.text('QUANTIDADE DE PROCESSOS', margin, 25);
  
  // Botão de filtros (visual)
  doc.setFillColor(30, 144, 255);
  doc.roundedRect(pageWidth - margin - 30, 18, 30, 10, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('Filtros', pageWidth - margin - 15, 25, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Filtrar processos baseado nos critérios
  const filteredProcesses = filterReportData(data);
  const total = filteredProcesses.length || 1; // Evitar divisão por zero
  
  // Layout do relatório
  const startY = 40;
  const chartHeight = 80;
  const chartWidth = (usableWidth - 20) / 3;
  
  // ===== GRÁFICO DE PRIORIDADE (ROSCA) =====
  doc.setFontSize(10);
  doc.text('Grau de Prioridade', margin + chartWidth/2, startY, { align: 'center' });
  
  // Contagem por prioridade
  const priorityCounts = {
    low: 0,
    medium: 0,
    high: 0
  };
  
  filteredProcesses.forEach(process => {
    if (process.priority && priorityCounts[process.priority] !== undefined) {
      priorityCounts[process.priority]++;
    }
  });
  
  // Calcular percentuais
  const highPct = priorityCounts.high / total;
  const mediumPct = priorityCounts.medium / total;
  const lowPct = priorityCounts.low / total;
  
  // Centro do gráfico
  const centerX1 = margin + chartWidth/2;
  const centerY1 = startY + 40;
  const outerRadius = 30;
  const innerRadius = 18;
  
  // Desenhar os segmentos
  // Prioridade Baixa (verde-azulado)
  doc.setFillColor(75, 192, 192);
  drawDonutSegment(doc, centerX1, centerY1, innerRadius, outerRadius, 0, lowPct * 360);
  
  // Prioridade Média (azul)
  doc.setFillColor(54, 162, 235);
  drawDonutSegment(doc, centerX1, centerY1, innerRadius, outerRadius, lowPct * 360, lowPct * 360 + mediumPct * 360);
  
  // Prioridade Alta (verde escuro)
  doc.setFillColor(75, 120, 120);
  drawDonutSegment(doc, centerX1, centerY1, innerRadius, outerRadius, lowPct * 360 + mediumPct * 360, 360);
  
  // Legendas dos percentuais
  doc.setFontSize(8);
  doc.text(`${Math.round(lowPct * 100)}%`, centerX1 - 15, centerY1 + 50);
  doc.text(`${Math.round(mediumPct * 100)}%`, centerX1, centerY1 + 50);
  doc.text(`${Math.round(highPct * 100)}%`, centerX1 + 15, centerY1 + 50);
  
  // ===== GRÁFICO DE STATUS (ROSCA) =====
  doc.setFontSize(10);
  doc.text('Status', margin + chartWidth + 10 + chartWidth/2, startY, { align: 'center' });
  
  // Contagem por status
  const statusCounts = {
    draft: 0,
    in_progress: 0,
    completed: 0,
    canceled: 0
  };
  
  filteredProcesses.forEach(process => {
    if (process.status && statusCounts[process.status] !== undefined) {
      statusCounts[process.status]++;
    }
  });
  
  // Calcular percentuais
  const draftPct = statusCounts.draft / total;
  const inProgressPct = statusCounts.in_progress / total;
  const completedPct = statusCounts.completed / total;
  const canceledPct = statusCounts.canceled / total;
  
  // Centro do gráfico
  const centerX2 = margin + chartWidth + 10 + chartWidth/2;
  const centerY2 = startY + 40;
  
  // Desenhar segmentos
  // Em andamento (azul)
  doc.setFillColor(54, 162, 235);
  drawDonutSegment(doc, centerX2, centerY2, innerRadius, outerRadius, 0, inProgressPct * 360);
  
  // Concluído (verde-azulado)
  doc.setFillColor(75, 192, 192);
  drawDonutSegment(doc, centerX2, centerY2, innerRadius, outerRadius, inProgressPct * 360, inProgressPct * 360 + completedPct * 360);
  
  // Labels para os status
  doc.setFontSize(6);
  doc.text("CONCLUÍDOS", centerX2 - 35, centerY2 - 20);
  doc.text("EM ANDAMENTO", centerX2 + 15, centerY2 - 20);
  
  // Percentuais na legenda
  doc.setFontSize(8);
  doc.text(`${Math.round(draftPct * 100)}%`, centerX2 - 15, centerY2 + 50);
  doc.text(`${Math.round(completedPct * 100)}%`, centerX2, centerY2 + 50);
  doc.text(`${Math.round(inProgressPct * 100)}%`, centerX2 + 15, centerY2 + 50);
  
  // ===== GRÁFICO DE FONTES (BARRAS) =====
  doc.setFontSize(10);
  doc.text('Fonte', margin + 2*chartWidth + 20 + chartWidth/2, startY, { align: 'center' });
  
  // Contagem por fonte
  const sourceCounts = new Map<number, number>();
  filteredProcesses.forEach(process => {
    const count = sourceCounts.get(process.sourceId) || 0;
    sourceCounts.set(process.sourceId, count + 1);
  });
  
  // Ordenar fontes por quantidade (decrescente)
  const sortedSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Limitar a 5 fontes principais
  
  // Configuração para o gráfico de barras
  const barStartX = margin + 2*chartWidth + 35;
  const barStartY = startY + 10;
  const barMaxWidth = chartWidth - 40;
  const barHeight = 8;
  const barGap = 15;
  
  // Desenhar barras para cada fonte
  sortedSources.forEach((sourceEntry, index) => {
    const [sourceId, count] = sourceEntry;
    const source = data.sources.find(s => s.id === sourceId);
    const maxCount = Math.max(...sortedSources.map(s => s[1]));
    const barWidth = (count / maxCount) * barMaxWidth;
    
    // Barra horizontal
    doc.setFillColor(44, 123, 182); // Azul
    doc.rect(barStartX, barStartY + index * barGap, barWidth, barHeight, 'F');
    
    // Label da fonte
    doc.setFontSize(7);
    const sourceLabel = source?.code || `${sourceId}`;
    doc.text(sourceLabel, barStartX - 5, barStartY + index * barGap + barHeight/2 + 2, { align: 'right' });
    
    // Valor numérico
    doc.setFontSize(7);
    doc.text(`${count}`, barStartX + barWidth + 3, barStartY + index * barGap + barHeight/2 + 2);
  });
  
  // Label "Responsável (Qtde)" conforme mostrado na imagem
  doc.setFontSize(9);
  doc.text('Responsável (Qtde)', barStartX + barMaxWidth/2, barStartY + 5*barGap + 10, { align: 'center' });
  
  // ===== GRÁFICO DE LINHA (CONCLUSÕES POR MÊS) =====
  const lineChartY = startY + chartHeight + 20;
  doc.setFontSize(10);
  doc.text('Conclusão de Processos / Mês', margin + usableWidth/2, lineChartY, { align: 'center' });
  
  // Linha de base
  const lineStartX = margin + 10;
  const lineEndX = pageWidth - margin - 10;
  const lineY = lineChartY + 40;
  const lineWidth = lineEndX - lineStartX;
  
  // Desenhar linha base
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(lineStartX, lineY, lineEndX, lineY);
  
  // Dados de exemplo para o gráfico de linha (similar à imagem)
  const monthlyValues = [
    { month: "Out 2023", value: 15 },
    { month: "Nov 2023", value: 25 },
    { month: "Dez 2023", value: 20 },
    { month: "Jan 2024", value: 30 },
    { month: "Fev 2024", value: 18 },
    { month: "Mar 2024", value: 28 },
    { month: "Abr 2024", value: 22 },
    { month: "Mai 2024", value: 32 }
  ];
  
  // Valor máximo para escala
  const maxValue = Math.max(...monthlyValues.map(mv => mv.value));
  const valueScale = 30 / maxValue;
  
  // Pontos para o gráfico de linha
  const points: Array<{x: number, y: number}> = [];
  const segmentWidth = lineWidth / (monthlyValues.length - 1);
  
  // Desenhar pontos e labels
  monthlyValues.forEach((mv, index) => {
    const x = lineStartX + (index * segmentWidth);
    const y = lineY - (mv.value * valueScale);
    points.push({ x, y });
    
    // Desenhar ponto
    doc.setFillColor(54, 162, 235);
    doc.circle(x, y, 1.5, 'F');
    
    // Label do mês
    doc.setFontSize(6);
    doc.text(mv.month, x, lineY + 7, { align: 'center' });
  });
  
  // Desenhar linhas entre pontos
  doc.setDrawColor(54, 162, 235);
  doc.setLineWidth(0.8);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i+1].x, points[i+1].y);
  }
  
  // Salvar o PDF
  doc.save(`relatorio_processos_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Gera um relatório em Excel
 */
export function generateExcelReport(data: ReportData): void {
  console.log('Excel export not implemented yet');
  alert('Exportação para Excel ainda não está implementada. Por favor, use a exportação para PDF.');
}