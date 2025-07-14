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
  'Em Andamento': [245, 158, 11],    // amarelo #F59E0B
  'Concluído': [16, 185, 129],       // verde #10B981
  'Cancelado': [240, 249, 255],      // azul claro quase branco #F0F9FF
  'Atrasado': [239, 68, 68]          // vermelho #EF4444
};

const CHART_COLORS = {
  blue: [0, 136, 254],   // #0088FE
  green: [0, 196, 159],  // #00C49F
  yellow: [255, 187, 40], // #FFBB28
  orange: [255, 128, 66], // #FF8042
  purple: [136, 132, 216] // #8884d8
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
 * Desenha um gráfico de pizza (pie chart) no PDF
 */
function drawPieChart(
  doc: jsPDF, 
  data: Array<{name: string, value: number, color: number[]}>, 
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
  
  // Desenhar gráfico de pizza
  const centerX = x + width/2;
  const centerY = y + height/2 + 10;
  const radius = Math.min(width, height) / 3;
  
  let startAngle = 0;
  
  // Desenhar setores da pizza
  data.forEach((item, index) => {
    if (item.value === 0) return;
    
    const portion = item.value / total;
    const angle = portion * 360;
    const endAngle = startAngle + angle;
    
    // Desenhar setor
    doc.setFillColor(...item.color);
    drawPieSlice(doc, centerX, centerY, radius, startAngle, endAngle);
    
    // Preparar para o próximo setor
    startAngle = endAngle;
  });
  
  // Adicionar legenda
  const legendX = x + 10;
  let legendY = y + height - 10;
  const legendSquareSize = 5;
  const legendSpacing = 15;
  
  doc.setFontSize(8);
  data.forEach(item => {
    if (item.value === 0) return;
    
    // Desenhar quadrado colorido
    doc.setFillColor(...item.color);
    doc.rect(legendX, legendY - legendSquareSize, legendSquareSize, legendSquareSize, 'F');
    
    // Adicionar texto da legenda
    doc.setTextColor(0, 0, 0);
    doc.text(`${item.name} (${Math.round((item.value / total) * 100)}%)`, legendX + legendSquareSize + 3, legendY);
    
    // Mover para o próximo item da legenda
    legendY -= legendSpacing;
  });
}

/**
 * Desenha um setor de gráfico de pizza
 */
function drawPieSlice(doc: jsPDF, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  // Converter ângulos para radianos
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  // Calcular pontos
  const startX = centerX + radius * Math.cos(startRad);
  const startY = centerY + radius * Math.sin(startRad);
  
  // Criar o caminho
  const path = new Path2D();
  path.moveTo(centerX, centerY);
  path.lineTo(startX, startY);
  
  // Usar segmentos para aproximar o arco (mais segmentos = mais suave)
  const segments = Math.max(Math.ceil((endAngle - startAngle) / 5), 1);
  for (let i = 1; i <= segments; i++) {
    const angle = startRad + (i / segments) * (endRad - startRad);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Desenhar linha até o ponto no arco
    doc.line(
      path.currentX || centerX, 
      path.currentY || centerY, 
      x, 
      y
    );
  }
  
  // Fechar o caminho de volta ao centro
  doc.line(
    path.currentX || centerX, 
    path.currentY || centerY, 
    centerX, 
    centerY
  );
  
  // Preencher o setor
  // Como jsPDF não tem método fill() para paths complexos,
  // usamos uma aproximação criando um triângulo do centro para o arco
  doc.triangle(
    centerX, 
    centerY, 
    startX, 
    startY, 
    centerX + radius * Math.cos((startRad + endRad) / 2), 
    centerY + radius * Math.sin((startRad + endRad) / 2), 
    'F'
  );
}

/**
 * Desenha um gráfico de barras no PDF
 */
function drawBarChart(
  doc: jsPDF, 
  data: Array<{name: string, value: number, color: number[]}>, 
  title: string,
  x: number, 
  y: number, 
  width: number, 
  height: number,
  vertical: boolean = true
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
  
  // Encontrar valor máximo para escala
  const maxValue = Math.max(...data.map(item => item.value));
  
  if (vertical) {
    // Gráfico de barras verticais
    
    // Calcular dimensões
    const chartAreaHeight = height * 0.7;
    const chartAreaY = y + 20;
    const barWidth = (width - 20) / (data.length * 2); // Espaço entre barras
    const maxBarHeight = chartAreaHeight - 20;
    
    // Desenhar linha de base
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(x + 10, chartAreaY + chartAreaHeight - 15, x + width - 10, chartAreaY + chartAreaHeight - 15);
    
    // Desenhar barras
    data.forEach((item, index) => {
      const normalizedValue = maxValue > 0 ? item.value / maxValue : 0;
      const barHeight = normalizedValue * maxBarHeight;
      const barX = x + 10 + (index * 2 + 1) * barWidth;
      const barY = chartAreaY + chartAreaHeight - 15 - barHeight;
      
      // Desenhar barra
      doc.setFillColor(...item.color);
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      // Adicionar rótulo abaixo da barra
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      // Truncar nomes longos
      const displayName = item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name;
      doc.text(displayName, barX + barWidth/2, chartAreaY + chartAreaHeight - 8, { align: 'center' });
    });
    
    // Adicionar legendas para valores
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    for (let i = 0; i <= 1; i += 0.25) {
      const valueY = chartAreaY + chartAreaHeight - 15 - (i * maxBarHeight);
      const value = Math.round(i * maxValue * 100) / 100;
      doc.text(value.toString(), x + 5, valueY, { align: 'right' });
      
      // Linha pontilhada opcional
      /*
      doc.setLineDashPattern([1, 1], 0);
      doc.line(x + 10, valueY, x + width - 10, valueY);
      doc.setLineDashPattern([], 0);
      */
    }
  } else {
    // Gráfico de barras horizontais
    
    // Calcular dimensões
    const chartStartX = x + 50; // Espaço para rótulos à esquerda
    const barHeight = 12;
    const barGap = 8;
    const maxBarWidth = width - 60; // Espaço para valores à direita
    
    // Desenhar barras
    data.forEach((item, index) => {
      const normalizedValue = maxValue > 0 ? item.value / maxValue : 0;
      const barWidth = normalizedValue * maxBarWidth;
      const barY = y + 30 + (index * (barHeight + barGap));
      
      // Desenhar barra
      doc.setFillColor(...item.color);
      doc.rect(chartStartX, barY, barWidth, barHeight, 'F');
      
      // Adicionar rótulo à esquerda
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      // Truncar nomes longos
      const displayName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
      doc.text(displayName, chartStartX - 3, barY + barHeight/2 + 3, { align: 'right' });
      
      // Adicionar valor à direita
      doc.text(item.value.toString(), chartStartX + barWidth + 5, barY + barHeight/2 + 3);
    });
  }
  
  // Adicionar legenda do gráfico
  const legendX = x + 10;
  const legendY = y + height - 10;
  
  // Adicionar título da legenda (opcional)
  doc.setFontSize(8);
  doc.text('Quantidade', legendX, legendY);
  
  // Desenhar quadrado colorido da legenda
  if (data.length > 0) {
    doc.setFillColor(...data[0].color);
    doc.rect(legendX, legendY - 8, 5, 5, 'F');
  }
}

/**
 * Desenha um gráfico de barras horizontais para desempenho de usuário
 */
function drawUserPerformanceChart(
  doc: jsPDF, 
  data: Array<{name: string, total: number, completed: number, color: number[]}>, 
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
  
  // Encontrar valor máximo para escala
  const maxValue = Math.max(...data.map(item => item.total));
  
  // Calcular dimensões
  const chartStartX = x + 70; // Espaço para rótulos à esquerda
  const barHeight = 10;
  const barGap = 10;
  const maxBarWidth = width - 80; // Espaço para valores à direita
  
  // Desenhar barras
  data.forEach((item, index) => {
    const normalizedTotal = maxValue > 0 ? item.total / maxValue : 0;
    const normalizedCompleted = maxValue > 0 ? item.completed / maxValue : 0;
    
    const totalBarWidth = normalizedTotal * maxBarWidth;
    const completedBarWidth = normalizedCompleted * maxBarWidth;
    
    const barY = y + 30 + (index * (barHeight + barGap));
    
    // Desenhar barra do total
    doc.setFillColor(120, 120, 200); // Cor para total
    doc.rect(chartStartX, barY, totalBarWidth, barHeight, 'F');
    
    // Desenhar barra de concluídos (sobreposta)
    doc.setFillColor(100, 200, 100); // Cor para concluídos
    doc.rect(chartStartX, barY + barHeight/2, completedBarWidth, barHeight/2, 'F');
    
    // Adicionar rótulo à esquerda
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    // Truncar nomes longos
    const displayName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
    doc.text(displayName, chartStartX - 3, barY + barHeight/2 + 3, { align: 'right' });
    
    // Adicionar valores à direita
    doc.text(`${item.total}`, chartStartX + totalBarWidth + 5, barY + barHeight/2);
    doc.text(`${item.completed}`, chartStartX + completedBarWidth + 5, barY + barHeight);
  });
  
  // Adicionar legenda
  const legendX = x + 10;
  const legendY = y + height - 15;
  
  // Total
  doc.setFillColor(120, 120, 200); // Cor para total
  doc.rect(legendX, legendY - 8, 5, 5, 'F');
  doc.setFontSize(8);
  doc.text('Total', legendX + 8, legendY - 5);
  
  // Concluídos
  doc.setFillColor(100, 200, 100); // Cor para concluídos
  doc.rect(legendX + 40, legendY - 8, 5, 5, 'F');
  doc.text('Concluídos', legendX + 48, legendY - 5);
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
    drawPieChart(doc, statusData, 'Processos por Status', 
      margin, margin + 15, cardWidth, cardHeight);
    
    drawBarChart(doc, modalityData, 'Processos por Modalidade', 
      margin + cardWidth + 10, margin + 15, cardWidth, cardHeight);
    
    // Segunda linha
    drawBarChart(doc, sourceData, 'Processos por Fonte', 
      margin, margin + cardHeight + 25, cardWidth, cardHeight, false);
    
    drawUserPerformanceChart(doc, userPerformanceData, 'Desempenho por Usuário', 
      margin + cardWidth + 10, margin + cardHeight + 25, cardWidth, cardHeight);
    
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