import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";
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

// Cores utilizadas nos gráficos
// Cores padronizadas para status dos processos (seguindo padrão dos gráficos)
const STATUS_COLORS = {
  'Em Andamento': '#F59E0B',    // amarelo
  'Concluído': '#10B981',       // verde
  'Cancelado': '#F0F9FF',       // azul claro quase branco
  'Atrasado': '#EF4444'         // vermelho
};

const CHART_COLORS = {
  blue: '#0088FE',     // Azul
  green: '#00C49F',    // Verde
  yellow: '#FFBB28',   // Amarelo
  orange: '#FF8042',   // Laranja
  purple: '#8884d8'    // Roxo
};

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
 * Gera dados para o gráfico de status de processos
 */
function getProcessStatusData(processes: Process[]) {
  const statusCounts = {
    draft: 0,
    in_progress: 0,
    completed: 0,
    canceled: 0
  };
  
  processes.forEach(process => {
    if (process.status && statusCounts[process.status as keyof typeof statusCounts] !== undefined) {
      statusCounts[process.status as keyof typeof statusCounts]++;
    }
  });
  
  return [
    { name: "Rascunho", value: statusCounts.draft, color: CHART_COLORS.blue },
    { name: "Em Andamento", value: statusCounts.in_progress, color: CHART_COLORS.green },
    { name: "Concluído", value: statusCounts.completed, color: CHART_COLORS.yellow },
    { name: "Cancelado", value: statusCounts.canceled, color: CHART_COLORS.orange }
  ];
}

/**
 * Gera dados para o gráfico de modalidades de processos
 */
function getProcessModalityData(processes: Process[], modalities: BiddingModality[]) {
  const modalityCounts = new Map<number, number>();
  
  processes.forEach(process => {
    const count = modalityCounts.get(process.modalityId) || 0;
    modalityCounts.set(process.modalityId, count + 1);
  });
  
  return Array.from(modalityCounts.entries()).map(([modalityId, count]) => {
    const modality = modalities.find(m => m.id === modalityId);
    return {
      name: modality?.name || `Modalidade ${modalityId}`,
      value: count,
      color: CHART_COLORS.blue
    };
  });
}

/**
 * Gera dados para o gráfico de fontes de recursos
 */
function getProcessSourceData(processes: Process[], sources: ResourceSource[]) {
  const sourceCounts = new Map<number, number>();
  
  processes.forEach(process => {
    const count = sourceCounts.get(process.sourceId) || 0;
    sourceCounts.set(process.sourceId, count + 1);
  });
  
  return Array.from(sourceCounts.entries()).map(([sourceId, count]) => {
    const source = sources.find(s => s.id === sourceId);
    return {
      name: source ? `Fonte ${source.code}` : `Fonte ${sourceId}`,
      value: count,
      color: CHART_COLORS.green
    };
  });
}

/**
 * Gera dados para o gráfico de desempenho por usuário
 */
function getUserPerformanceData(processes: Process[], users: User[]) {
  const userStats = new Map<number, { total: number, completed: number }>();
  
  users.forEach(user => {
    userStats.set(user.id, { total: 0, completed: 0 });
  });
  
  processes.forEach(process => {
    const userStat = userStats.get(process.responsibleId);
    if (userStat) {
      userStat.total++;
      if (process.status === 'completed') {
        userStat.completed++;
      }
    }
  });
  
  return Array.from(userStats.entries())
    .filter(([_, stats]) => stats.total > 0)
    .map(([userId, stats]) => {
      const user = users.find(u => u.id === userId);
      return {
        name: user ? user.fullName : `Usuário ${userId}`,
        total: stats.total,
        completed: stats.completed,
        color: CHART_COLORS.purple
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Limitar aos 5 usuários mais ativos
}

/**
 * Desenha um gráfico de pizza simplificado
 */
function drawPieChart(
  doc: jsPDF, 
  data: Array<{name: string, value: number, color: string}>, 
  title: string,
  x: number, 
  y: number, 
  width: number, 
  height: number
) {
  // Título do gráfico
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + width/2, y, { align: 'center' });
  
  // Verificar se há dados para desenhar
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    doc.setFontSize(10);
    doc.text('Não há dados disponíveis', x + width/2, y + height/2, { align: 'center' });
    return;
  }
  
  // Configurações para o desenho do gráfico
  const centerX = x + width/2;
  const centerY = y + height/2;
  const radius = Math.min(width, height) / 3;
  
  // Simplificado: Desenhar apenas um círculo colorido para representar
  // Usamos o primeiro item com valor não zero
  const firstItemWithValue = data.find(item => item.value > 0);
  if (firstItemWithValue) {
    // Converter cor de hexadecimal para RGB
    const color = firstItemWithValue.color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    doc.setFillColor(r, g, b);
    doc.circle(centerX, centerY, radius, 'F');
    
    // Adicionar buraco no centro para parecer uma rosca
    doc.setFillColor(255, 255, 255);
    doc.circle(centerX, centerY, radius * 0.5, 'F');
  }
  
  // Adicionar legendas abaixo do gráfico
  let legendY = y + height - 20;
  const legendX = x + 20;
  const legendItemHeight = 12;
  const legendSquareSize = 8;
  
  // Ordenar os itens por valor (do maior para o menor)
  const sortedData = [...data].filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  
  sortedData.forEach((item, index) => {
    const itemPercentage = (item.value / total) * 100;
    if (itemPercentage > 0) {
      // Converter cor
      const color = item.color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // Desenhar quadrado de cor
      doc.setFillColor(r, g, b);
      doc.rect(legendX, legendY, legendSquareSize, legendSquareSize, 'F');
      
      // Adicionar texto da legenda
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `${item.name} (${itemPercentage.toFixed(0)}%)`, 
        legendX + legendSquareSize + 5, 
        legendY + legendSquareSize/2 + 2
      );
      
      // Mover para o próximo item
      legendY += legendItemHeight;
    }
  });
}

/**
 * Desenha um gráfico de barras simplificado
 */
function drawBarChart(
  doc: jsPDF, 
  data: Array<{name: string, value: number, color: string}>, 
  title: string,
  x: number, 
  y: number, 
  width: number, 
  height: number,
  isVertical: boolean = true
) {
  // Título do gráfico
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + width/2, y, { align: 'center' });
  
  // Verificar se há dados para desenhar
  if (data.length === 0) {
    doc.setFontSize(10);
    doc.text('Não há dados disponíveis', x + width/2, y + height/2, { align: 'center' });
    return;
  }
  
  // Encontrar valor máximo
  const maxValue = Math.max(...data.map(item => item.value), 1);
  
  if (isVertical) {
    // Gráfico de barras verticais
    const chartTop = y + 20;
    const chartBottom = y + height - 30;
    const chartLeft = x + 40;
    const chartRight = x + width - 20;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;
    
    // Desenhar eixo Y
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(chartLeft, chartTop, chartLeft, chartBottom);
    
    // Desenhar eixo X
    doc.line(chartLeft, chartBottom, chartRight, chartBottom);
    
    // Desenhar barras
    const barWidth = chartWidth / data.length / 2;
    const barGap = barWidth;
    
    data.forEach((item, index) => {
      // Converter cor de hexadecimal para RGB
      const color = item.color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      const barX = chartLeft + barGap + index * (barWidth + barGap);
      const barHeight = (item.value / maxValue) * chartHeight;
      const barY = chartBottom - barHeight;
      
      // Desenhar a barra
      doc.setFillColor(r, g, b);
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      // Adicionar rótulo abaixo da barra
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      // Truncar nomes longos
      const displayName = item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name;
      doc.text(displayName, barX + barWidth/2, chartBottom + 10, { align: 'center' });
    });
    
    // Adicionar escala no eixo Y (opcional)
    doc.setFontSize(7);
    for (let i = 0; i <= 1; i += 0.25) {
      const value = Math.round(maxValue * i);
      const yPos = chartBottom - i * chartHeight;
      doc.text(value.toString(), chartLeft - 5, yPos, { align: 'right' });
      
      // Linha pontilhada horizontal opcional
      /*
      doc.setLineDashPattern([1, 1], 0);
      doc.line(chartLeft, yPos, chartRight, yPos);
      doc.setLineDashPattern([], 0);
      */
    }
    
    // Adicionar título da legenda
    const legendX = x + 20;
    const legendY = y + height - 10;
    doc.setFontSize(7);
    doc.text('Quantidade', legendX, legendY);
    
    // Desenhar quadrado de legenda
    if (data.length > 0) {
      const color = data[0].color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      doc.setFillColor(r, g, b);
      doc.rect(legendX + 35, legendY - 7, 8, 8, 'F');
    }
  } else {
    // Gráfico de barras horizontais
    const chartTop = y + 20;
    const chartBottom = y + height - 30;
    const chartLeft = x + 60; // Espaço para rótulos
    const chartRight = x + width - 20;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;
    
    // Desenhar barras
    const barHeight = chartHeight / data.length / 2;
    const barGap = barHeight;
    let currentY = chartTop + barGap;
    
    data.forEach((item, index) => {
      // Converter cor de hexadecimal para RGB
      const color = item.color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      const barWidth = (item.value / maxValue) * chartWidth;
      
      // Desenhar a barra
      doc.setFillColor(r, g, b);
      doc.rect(chartLeft, currentY, barWidth, barHeight, 'F');
      
      // Adicionar rótulo à esquerda da barra
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      // Truncar nomes longos
      const displayName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
      doc.text(displayName, chartLeft - 5, currentY + barHeight/2 + 2, { align: 'right' });
      
      // Adicionar valor à direita da barra
      doc.text(item.value.toString(), chartLeft + barWidth + 5, currentY + barHeight/2 + 2);
      
      // Mover para a próxima barra
      currentY += barHeight + barGap;
    });
    
    // Adicionar título da legenda
    const legendX = x + 20;
    const legendY = y + height - 10;
    doc.setFontSize(7);
    doc.text('Quantidade', legendX, legendY);
    
    // Desenhar quadrado de legenda
    if (data.length > 0) {
      const color = data[0].color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      doc.setFillColor(r, g, b);
      doc.rect(legendX + 35, legendY - 7, 8, 8, 'F');
    }
  }
}

/**
 * Desenha um gráfico de desempenho por usuário
 */
function drawUserPerformanceChart(
  doc: jsPDF, 
  data: Array<{name: string, total: number, completed: number, color: string}>, 
  title: string,
  x: number, 
  y: number, 
  width: number, 
  height: number
) {
  // Título do gráfico
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + width/2, y, { align: 'center' });
  
  // Verificar se há dados para desenhar
  if (data.length === 0) {
    doc.setFontSize(10);
    doc.text('Não há dados disponíveis', x + width/2, y + height/2, { align: 'center' });
    return;
  }
  
  // Encontrar valor máximo
  const maxValue = Math.max(...data.map(item => item.total), 1);
  
  // Configurações
  const chartTop = y + 20;
  const chartBottom = y + height - 30;
  const chartLeft = x + 60; // Espaço para rótulos
  const chartRight = x + width - 30; // Espaço para valores
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;
  
  // Desenhar barras
  const barHeight = chartHeight / data.length / 3;
  const barGap = barHeight * 2;
  let currentY = chartTop + barGap;
  
  data.forEach((item, index) => {
    // Converter cor de hexadecimal para RGB
    const colorTotal = CHART_COLORS.purple;
    const colorCompleted = CHART_COLORS.green;
    
    const rTotal = parseInt(colorTotal.slice(1, 3), 16);
    const gTotal = parseInt(colorTotal.slice(3, 5), 16);
    const bTotal = parseInt(colorTotal.slice(5, 7), 16);
    
    const rCompleted = parseInt(colorCompleted.slice(1, 3), 16);
    const gCompleted = parseInt(colorCompleted.slice(3, 5), 16);
    const bCompleted = parseInt(colorCompleted.slice(5, 7), 16);
    
    const barWidthTotal = (item.total / maxValue) * chartWidth;
    const barWidthCompleted = (item.completed / maxValue) * chartWidth;
    
    // Desenhar barra total
    doc.setFillColor(rTotal, gTotal, bTotal);
    doc.rect(chartLeft, currentY, barWidthTotal, barHeight, 'F');
    
    // Desenhar barra completada (menor)
    doc.setFillColor(rCompleted, gCompleted, bCompleted);
    doc.rect(chartLeft, currentY + barHeight, barWidthCompleted, barHeight/2, 'F');
    
    // Adicionar rótulo à esquerda
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    // Truncar nomes longos
    const displayName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
    doc.text(displayName, chartLeft - 5, currentY + barHeight/2, { align: 'right' });
    
    // Adicionar valores à direita
    doc.text(item.total.toString(), chartLeft + barWidthTotal + 5, currentY + barHeight/2);
    doc.text(item.completed.toString(), chartLeft + barWidthCompleted + 5, currentY + barHeight + barHeight/4);
    
    // Mover para a próxima barra
    currentY += barHeight + barGap;
  });
  
  // Adicionar legenda
  const legendX = x + 20;
  const legendY = y + height - 10;
  
  // Total
  const rTotal = parseInt(CHART_COLORS.purple.slice(1, 3), 16);
  const gTotal = parseInt(CHART_COLORS.purple.slice(3, 5), 16);
  const bTotal = parseInt(CHART_COLORS.purple.slice(5, 7), 16);
  
  doc.setFillColor(rTotal, gTotal, bTotal);
  doc.rect(legendX, legendY - 7, 8, 8, 'F');
  doc.setFontSize(7);
  doc.text('Total', legendX + 12, legendY - 2);
  
  // Concluídos
  const rCompleted = parseInt(CHART_COLORS.green.slice(1, 3), 16);
  const gCompleted = parseInt(CHART_COLORS.green.slice(3, 5), 16);
  const bCompleted = parseInt(CHART_COLORS.green.slice(5, 7), 16);
  
  doc.setFillColor(rCompleted, gCompleted, bCompleted);
  doc.rect(legendX + 35, legendY - 7, 8, 8, 'F');
  doc.text('Concluídos', legendX + 47, legendY - 2);
}

/**
 * Gera um relatório PDF com os mesmos gráficos mostrados na interface
 */
export function generatePdfReport(data: ReportData): void {
  try {
    // Preparar dados
    const filteredProcesses = filterReportData(data);
    
    // Criar documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const usableWidth = pageWidth - (2 * margin);
    
    // Preparar dados para os gráficos
    const statusData = getProcessStatusData(filteredProcesses);
    const modalityData = getProcessModalityData(filteredProcesses, data.modalities);
    const sourceData = getProcessSourceData(filteredProcesses, data.sources);
    const userPerformanceData = getUserPerformanceData(filteredProcesses, data.users);
    
    // Configurar layout da página
    const cardWidth = usableWidth / 2 - 5;
    const cardHeight = 130;
    
    // Título do relatório
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Relatório de Processos', pageWidth / 2, margin, { align: 'center' });
    
    // Data de geração
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const today = new Date().toLocaleDateString('pt-BR');
    doc.text(`Gerado em: ${today}`, pageWidth - margin, margin, { align: 'right' });
    
    // Desenhar gráficos (2x2 grid)
    // Primeira linha
    drawPieChart(
      doc, 
      statusData, 
      'Processos por Status', 
      margin, 
      margin + 15, 
      cardWidth, 
      cardHeight
    );
    
    drawBarChart(
      doc, 
      modalityData, 
      'Processos por Modalidade', 
      margin + cardWidth + 10, 
      margin + 15, 
      cardWidth, 
      cardHeight
    );
    
    // Segunda linha
    drawBarChart(
      doc, 
      sourceData, 
      'Processos por Fonte', 
      margin, 
      margin + cardHeight + 25, 
      cardWidth, 
      cardHeight,
      false
    );
    
    drawUserPerformanceChart(
      doc, 
      userPerformanceData, 
      'Desempenho por Usuário', 
      margin + cardWidth + 10, 
      margin + cardHeight + 25, 
      cardWidth, 
      cardHeight
    );
    
    // Adicionar tabela com dados dos processos na segunda página
    if (data.reportType === 'processes' && filteredProcesses.length > 0) {
      doc.addPage();
      
      // Título da tabela
      doc.setFontSize(14);
      doc.text('Lista de Processos', pageWidth / 2, margin, { align: 'center' });
      
      // Preparar dados da tabela
      const tableData = filteredProcesses.map(process => {
        const modality = data.modalities.find(m => m.id === process.modalityId);
        const source = data.sources.find(s => s.id === process.sourceId);
        const responsible = data.users.find(u => u.id === process.responsibleId);
        
        return [
          process.pbdocNumber,
          process.description.length > 30 ? process.description.substring(0, 30) + '...' : process.description,
          modality?.name || `Modalidade ${process.modalityId}`,
          source?.code || `Fonte ${process.sourceId}`,
          responsible?.fullName || `Usuário ${process.responsibleId}`,
          getStatusLabel(process.status),
          getPriorityLabel(process.priority),
          new Date(process.createdAt).toLocaleDateString('pt-BR')
        ];
      });
      
      // Desenhar tabela
      autoTable(doc, {
        startY: margin + 10,
        head: [['PBDOC', 'Descrição', 'Modalidade', 'Fonte', 'Responsável', 'Status', 'Prioridade', 'Data Criação']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { top: margin, right: margin, bottom: margin, left: margin }
      });
    }
    
    // Adicionar rodapé com número de página em todas as páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `SEAP-PB - Sistema de Controle de Processos de Licitação - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    // Salvar o PDF
    doc.save(`relatorio-processos-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    alert('Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.');
  }
}

/**
 * Função auxiliar para obter o label de status
 */
function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'draft': 'Rascunho',
    'in_progress': 'Em Andamento',
    'completed': 'Concluído',
    'canceled': 'Cancelado'
  };
  return statusLabels[status] || status;
}

/**
 * Função auxiliar para obter o label de prioridade
 */
function getPriorityLabel(priority: string): string {
  const priorityLabels: Record<string, string> = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta'
  };
  return priorityLabels[priority] || priority;
}

/**
 * Exporta o dataset para arquivo Excel (não implementado)
 */
export function generateExcelReport(data: ReportData): void {
  console.log('Exportação para Excel não implementada');
  alert('Exportação para Excel ainda não está implementada. Por favor, use a exportação para PDF.');
}