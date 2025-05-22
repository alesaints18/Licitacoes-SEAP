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
 * Desenha um arco de círculo em coordenadas polares
 */
function drawArc(doc: jsPDF, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  // Converter ângulos para radianos
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  // Número de pontos para compor o arco
  const numPoints = Math.max(Math.ceil((endAngle - startAngle) / 5), 2);
  
  // Início do arco
  let x = centerX + radius * Math.cos(startRad);
  let y = centerY + radius * Math.sin(startRad);
  doc.lines([[0, 0]], centerX, centerY);
  doc.lines([[x - centerX, y - centerY]], centerX, centerY);
  
  // Desenhar segmentos do arco
  for (let i = 1; i <= numPoints; i++) {
    const angle = startRad + (i / numPoints) * (endRad - startRad);
    const nextX = centerX + radius * Math.cos(angle);
    const nextY = centerY + radius * Math.sin(angle);
    doc.lines([[nextX - x, nextY - y]], x, y);
    x = nextX;
    y = nextY;
  }
  
  // Fechar o arco voltando ao centro
  doc.lines([[centerX - x, centerY - y]], x, y);
}

/**
 * Desenha um gráfico de rosca (donut)
 */
function drawDonut(doc: jsPDF, centerX: number, centerY: number, innerRadius: number, outerRadius: number, data: {value: number, color: number[]}[]) {
  // Calcular total
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  
  // Ângulo inicial
  let currentAngle = 0;
  
  // Desenhar cada segmento
  data.forEach(item => {
    // Calcular ângulo do segmento
    const segmentAngle = (item.value / total) * 360;
    
    // Definir cor do segmento
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    
    // Desenhar segmento externo
    const endAngle = currentAngle + segmentAngle;
    
    // Desenhar segmento como um setor circular
    if (segmentAngle > 0) {
      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Desenhar o segmento como uma série de pequenos triângulos
      const steps = Math.max(Math.ceil(segmentAngle / 5), 1);
      
      for (let i = 0; i < steps; i++) {
        const angle1 = startRad + (i / steps) * (endRad - startRad);
        const angle2 = startRad + ((i + 1) / steps) * (endRad - startRad);
        
        const x1 = centerX + innerRadius * Math.cos(angle1);
        const y1 = centerY + innerRadius * Math.sin(angle1);
        const x2 = centerX + outerRadius * Math.cos(angle1);
        const y2 = centerY + outerRadius * Math.sin(angle1);
        const x3 = centerX + outerRadius * Math.cos(angle2);
        const y3 = centerY + outerRadius * Math.sin(angle2);
        const x4 = centerX + innerRadius * Math.cos(angle2);
        const y4 = centerY + innerRadius * Math.sin(angle2);
        
        // Desenhar polígono
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.triangle(x1, y1, x2, y2, x3, y3, 'F');
        doc.triangle(x1, y1, x3, y3, x4, y4, 'F');
      }
    }
    
    // Atualizar ângulo para o próximo segmento
    currentAngle = endAngle;
  });
}

/**
 * Gera um relatório PDF com gráficos e tabelas
 * Versão melhorada com maior legibilidade dos gráficos e textos
 */
export function generatePdfReport(data: ReportData): void {
  try {
    // Criar novo documento PDF - formato paisagem para melhor visualização dos gráficos
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const usableWidth = pageWidth - (2 * margin);
    
    // Filtrar processos baseado nos critérios
    const filteredProcesses = filterReportData(data);
    const total = filteredProcesses.length || 1;
    
    // CABEÇALHO DO RELATÓRIO - Mais proeminente
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text('SISTEMA DE CONTROLE DE PROCESSOS DE LICITAÇÃO - SEAP/PB', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('RELATÓRIO DE PROCESSOS', pageWidth / 2, 30, { align: 'center' });
    
    // Data de geração do relatório
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const today = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Gerado em: ${today}`, pageWidth - margin, 30, { align: 'right' });
    
    // Desenhar separador
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);
    
    // Layout do relatório - Organização por seções
    const startY = 45;
    
    // ===== PRIMEIRA LINHA - ESTATÍSTICAS GERAIS ===== 
    
    // Desenhar as caixas de estatísticas no topo
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(220, 220, 220);
    
    // Total de processos
    const boxWidth = (usableWidth - 30) / 4;
    const boxHeight = 25;
    const boxY = startY;
    
    // Box 1: Total de processos
    doc.roundedRect(margin, boxY, boxWidth, boxHeight, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('Total de Processos', margin + boxWidth/2, boxY + 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${filteredProcesses.length}`, margin + boxWidth/2, boxY + 20, { align: 'center' });
    
    // Box 2: Concluídos
    const completedCount = filteredProcesses.filter(p => p.status === 'completed').length;
    doc.roundedRect(margin + boxWidth + 10, boxY, boxWidth, boxHeight, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 0);
    doc.text('Concluídos', margin + boxWidth + 10 + boxWidth/2, boxY + 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${completedCount}`, margin + boxWidth + 10 + boxWidth/2, boxY + 20, { align: 'center' });
    
    // Box 3: Em andamento
    const inProgressCount = filteredProcesses.filter(p => p.status === 'in_progress').length;
    doc.roundedRect(margin + 2*(boxWidth + 10), boxY, boxWidth, boxHeight, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text('Em Andamento', margin + 2*(boxWidth + 10) + boxWidth/2, boxY + 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${inProgressCount}`, margin + 2*(boxWidth + 10) + boxWidth/2, boxY + 20, { align: 'center' });
    
    // Box 4: Prioridade Alta
    const highPriorityCount = filteredProcesses.filter(p => p.priority === 'high').length;
    doc.roundedRect(margin + 3*(boxWidth + 10), boxY, boxWidth, boxHeight, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(204, 0, 0);
    doc.text('Prioridade Alta', margin + 3*(boxWidth + 10) + boxWidth/2, boxY + 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${highPriorityCount}`, margin + 3*(boxWidth + 10) + boxWidth/2, boxY + 20, { align: 'center' });
    
    // ===== SEGUNDA LINHA - GRÁFICOS PRINCIPAIS =====
    const chartStartY = startY + boxHeight + 15;
    const chartWidth = usableWidth / 2 - 10;
    const chartHeight = 100;
    
    // SEÇÃO 1: GRÁFICO DE PRIORIDADE
    // Título da seção
    doc.setDrawColor(0, 102, 204);
    doc.setFillColor(240, 240, 250);
    doc.roundedRect(margin, chartStartY, chartWidth, 20, 2, 2, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('DISTRIBUIÇÃO POR PRIORIDADE', margin + 10, chartStartY + 13);
    
    // Dados de prioridade
    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0
    };
    
    filteredProcesses.forEach(process => {
      if (process.priority) {
        priorityCounts[process.priority]++;
      }
    });
    
    // Área do gráfico
    const priorityChartY = chartStartY + 30;
    
    // Tamanho maior para o gráfico
    const centerX1 = margin + chartWidth/2;
    const centerY1 = priorityChartY + 40;
    const outerRadius = 35;
    const innerRadius = 15;
    
    // Desenhar gráfico de rosca com prioridades
    drawDonut(doc, centerX1, centerY1, innerRadius, outerRadius, [
      { value: priorityCounts.high, color: [220, 53, 69] },    // Alta - Vermelho
      { value: priorityCounts.medium, color: [255, 193, 7] },  // Média - Amarelo
      { value: priorityCounts.low, color: [40, 167, 69] }      // Baixa - Verde
    ]);
    
    // Legendas melhoradas
    doc.setFontSize(10);
    
    // Legenda Alta
    const legendY = centerY1 + outerRadius + 15;
    doc.setFillColor(220, 53, 69);
    doc.rect(centerX1 - 60, legendY, 10, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(`Alta: ${priorityCounts.high} (${Math.round(priorityCounts.high/total*100)}%)`, centerX1 - 45, legendY + 8);
    
    // Legenda Média
    doc.setFillColor(255, 193, 7);
    doc.rect(centerX1 - 60, legendY + 15, 10, 10, 'F');
    doc.text(`Média: ${priorityCounts.medium} (${Math.round(priorityCounts.medium/total*100)}%)`, centerX1 - 45, legendY + 23);
    
    // Legenda Baixa
    doc.setFillColor(40, 167, 69);
    doc.rect(centerX1 - 60, legendY + 30, 10, 10, 'F');
    doc.text(`Baixa: ${priorityCounts.low} (${Math.round(priorityCounts.low/total*100)}%)`, centerX1 - 45, legendY + 38);
    
    // SEÇÃO 2: GRÁFICO DE STATUS
    // Título da seção
    doc.setDrawColor(0, 102, 204);
    doc.setFillColor(240, 240, 250);
    doc.roundedRect(margin + chartWidth + 20, chartStartY, chartWidth, 20, 2, 2, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('DISTRIBUIÇÃO POR STATUS', margin + chartWidth + 30, chartStartY + 13);
    
    // Dados de status
    const statusCounts = {
      draft: 0,
      in_progress: 0,
      completed: 0,
      canceled: 0
    };
    
    filteredProcesses.forEach(process => {
      if (process.status) {
        statusCounts[process.status]++;
      }
    });
    
    // Centro do gráfico de status
    const centerX2 = margin + chartWidth + 20 + chartWidth/2;
    const centerY2 = centerY1;
    
    // Desenhar gráfico de rosca de status - mais legível
    drawDonut(doc, centerX2, centerY2, innerRadius, outerRadius, [
      { value: statusCounts.completed, color: [40, 167, 69] },     // Concluído - Verde
      { value: statusCounts.in_progress, color: [0, 123, 255] },   // Em andamento - Azul
      { value: statusCounts.draft, color: [108, 117, 125] },       // Rascunho - Cinza
      { value: statusCounts.canceled, color: [220, 53, 69] }       // Cancelado - Vermelho
    ]);
    
    // Legendas melhoradas para status
    // Legenda Concluído
    doc.setFillColor(40, 167, 69);
    doc.rect(centerX2 - 60, legendY, 10, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(`Concluído: ${statusCounts.completed} (${Math.round(statusCounts.completed/total*100)}%)`, centerX2 - 45, legendY + 8);
    
    // Legenda Em andamento
    doc.setFillColor(0, 123, 255);
    doc.rect(centerX2 - 60, legendY + 15, 10, 10, 'F');
    doc.text(`Em andamento: ${statusCounts.in_progress} (${Math.round(statusCounts.in_progress/total*100)}%)`, centerX2 - 45, legendY + 23);
    
    // Legenda Rascunho
    doc.setFillColor(108, 117, 125);
    doc.rect(centerX2 - 60, legendY + 30, 10, 10, 'F');
    doc.text(`Rascunho: ${statusCounts.draft} (${Math.round(statusCounts.draft/total*100)}%)`, centerX2 - 45, legendY + 38);
    
    // Legenda Cancelado
    doc.setFillColor(220, 53, 69);
    doc.rect(centerX2 - 60, legendY + 45, 10, 10, 'F');
    doc.text(`Cancelado: ${statusCounts.canceled} (${Math.round(statusCounts.canceled/total*100)}%)`, centerX2 - 45, legendY + 53);
    
    // ===== TERCEIRA LINHA - FONTE E GRÁFICO DE LINHA =====
    const thirdSectionY = chartStartY + chartHeight + 50;
    
    // SEÇÃO 3: PROCESSOS POR FONTE (BARRAS HORIZONTAIS)
    // Título da seção
    doc.setDrawColor(0, 102, 204);
    doc.setFillColor(240, 240, 250);
    doc.roundedRect(margin, thirdSectionY, chartWidth, 20, 2, 2, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('PROCESSOS POR FONTE DE RECURSOS', margin + 10, thirdSectionY + 13);
    
    // Processos por fonte
    const sourceCounts = new Map<number, number>();
    filteredProcesses.forEach(process => {
      const count = sourceCounts.get(process.sourceId) || 0;
      sourceCounts.set(process.sourceId, count + 1);
    });
    
    // Ordenar fontes por quantidade
    const sortedSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Configurações para barras horizontais
    const barAreaHeight = 120;
    const barStartX = margin + 70;
    const barStartY = thirdSectionY + 35;
    const barMaxWidth = chartWidth - 100;
    const barHeight = 15;
    const barGap = 20;
    
    // Desenhar barras para cada fonte - versão mais legível
    sortedSources.forEach((sourceEntry, index) => {
      const [sourceId, count] = sourceEntry;
      const source = data.sources.find(s => s.id === sourceId);
      const maxCount = Math.max(...sortedSources.map(s => s[1]));
      const barWidth = (count / maxCount) * barMaxWidth;
      
      // Desenhar barra com borda
      doc.setFillColor(0, 123, 255);
      doc.setDrawColor(0, 80, 187);
      doc.roundedRect(barStartX, barStartY + index * barGap, barWidth, barHeight, 1, 1, 'FD');
      
      // Adicionar label e valor
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const sourceLabel = source ? `${source.code} - ${source.description}` : `Fonte ${sourceId}`;
      // Limite o tamanho do texto da fonte
      const truncatedLabel = sourceLabel.length > 25 ? sourceLabel.substring(0, 22) + '...' : sourceLabel;
      doc.text(truncatedLabel, barStartX - 5, barStartY + index * barGap + barHeight/2 + 4, { align: 'right' });
      
      // Valor dentro da barra se for larga o suficiente, ou depois da barra
      if (barWidth > 40) {
        doc.setTextColor(255, 255, 255);
        doc.text(`${count}`, barStartX + barWidth - 10, barStartY + index * barGap + barHeight/2 + 4, { align: 'right' });
      } else {
        doc.setTextColor(0, 0, 0);
        doc.text(`${count}`, barStartX + barWidth + 10, barStartY + index * barGap + barHeight/2 + 4);
      }
    });
    
    // SEÇÃO 4: CONCLUSÃO DE PROCESSOS POR MÊS (GRÁFICO DE LINHA)
    // Título da seção
    doc.setDrawColor(0, 102, 204);
    doc.setFillColor(240, 240, 250);
    doc.roundedRect(margin + chartWidth + 20, thirdSectionY, chartWidth, 20, 2, 2, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text('CONCLUSÃO DE PROCESSOS POR MÊS', margin + chartWidth + 30, thirdSectionY + 13);
    
    // Configuração do gráfico de linha melhorado
    const lineStartX = margin + chartWidth + 50;
    const lineEndX = pageWidth - margin - 30;
    const lineWidth = lineEndX - lineStartX;
    const lineY = thirdSectionY + 110;
    
    // Desenhar linha base e eixo Y
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(lineStartX, lineY, lineEndX, lineY); // Eixo X
    doc.line(lineStartX, lineY, lineStartX, thirdSectionY + 40); // Eixo Y
    
    // Dados para o gráfico de linha (dados reais ou dados fictícios melhorados)
    const monthlyValues = [
      { month: "Jan", value: 15 },
      { month: "Fev", value: 25 },
      { month: "Mar", value: 20 },
      { month: "Abr", value: 30 },
      { month: "Mai", value: 18 },
      { month: "Jun", value: 28 },
      { month: "Jul", value: 22 },
      { month: "Ago", value: 32 }
    ];
    
    // Valor máximo para escala
    const maxValue = Math.max(...monthlyValues.map(mv => mv.value));
    const valueScale = 60 / maxValue; // Aumento na altura do gráfico
    
    // Marcas no eixo Y
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const scaleSteps = 4;
    for (let i = 0; i <= scaleSteps; i++) {
      const yPos = lineY - (i * (60 / scaleSteps));
      const value = Math.round((i * maxValue) / scaleSteps);
      doc.setDrawColor(220, 220, 220);
      doc.line(lineStartX - 3, yPos, lineEndX, yPos); // Linha de grade
      doc.setTextColor(100, 100, 100);
      doc.text(`${value}`, lineStartX - 5, yPos + 3, { align: 'right' });
    }
    
    // Desenhar o gráfico de linha
    const linePoints: {x: number, y: number}[] = [];
    const segmentWidth = lineWidth / (monthlyValues.length - 1);
    
    monthlyValues.forEach((mv, index) => {
      const x = lineStartX + (index * segmentWidth);
      const y = lineY - (mv.value * valueScale);
      linePoints.push({ x, y });
      
      // Desenhar ponto maior e mais visível
      doc.setFillColor(0, 102, 204);
      doc.circle(x, y, 3, 'F');
      
      // Adicionar label do mês - mais legível
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(mv.month, x, lineY + 10, { align: 'center' });
      
      // Adicionar valor acima do ponto
      doc.setFontSize(8);
      doc.text(`${mv.value}`, x, y - 7, { align: 'center' });
    });
    
    // Desenhar linhas entre pontos - mais espessas
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(1.5);
    for (let i = 0; i < linePoints.length - 1; i++) {
      doc.line(linePoints[i].x, linePoints[i].y, linePoints[i+1].x, linePoints[i+1].y);
    }
    
    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Controle de Processos de Licitação - SEAP/PB', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar o PDF com nome mais descritivo
    doc.save(`relatorio-processos-licitacao-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}

/**
 * Exporta o dataset para arquivo Excel
 */
export function generateExcelReport(data: ReportData): void {
  console.log('Exportação para Excel não implementada');
  alert('Exportação para Excel ainda não está implementada. Por favor, use a exportação para PDF.');
}
function generateDepartmentReport(doc: jsPDF, data: ReportData): void {
  if (!data.departments) return;
  
  const departmentStats = data.departments.map(dept => {
    const deptUsers = data.users.filter(u => u.department === dept.name);
    const deptProcesses = data.processes.filter(p => {
      const user = data.users.find(u => u.id === p.responsibleId);
      return user?.department === dept.name;
    });
    
    const completed = deptProcesses.filter(p => p.status === 'completed').length;
    const percentage = deptProcesses.length > 0 ? Math.round((completed / deptProcesses.length) * 100) : 0;
    
    return {
      department: dept,
      users: deptUsers.length,
      total: deptProcesses.length,
      completed,
      percentage
    };
  });
  
  const tableData = departmentStats.map(stats => [
    stats.department.name,
    stats.department.description || '-',
    stats.users.toString(),
    stats.total.toString(),
    stats.completed.toString(),
    `${stats.percentage}%`
  ]);
  
  autoTable(doc, {
    head: [['Setor', 'Descrição', 'Usuários', 'Processos', 'Concluídos', 'Taxa']],
    body: tableData,
    startY: 60,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 60 },
  });
}

/**
 * Generate Excel report
 */
export function generateExcelReport(data: ReportData): void {
  // In a real implementation, this would use a library like xlsx to generate Excel files
  // For this MVP, we'll create a CSV and trigger a download
  let csvContent = '';
  
  switch (data.reportType) {
    case 'processes':
      csvContent = generateProcessCsv(data);
      break;
    case 'users':
      csvContent = generateUserCsv(data);
      break;
    case 'departments':
      csvContent = generateDepartmentCsv(data);
      break;
  }
  
  // Create a download link for the CSV
  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `relatorio-${data.reportType}-${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate CSV for processes report
 */
function generateProcessCsv(data: ReportData): string {
  const filteredProcesses = filterReportData(data);
  
  // Create headers
  let csv = 'PBDOC,Descrição,Modalidade,Fonte,Responsável,Status,Prioridade,Criado em\n';
  
  // Add rows
  filteredProcesses.forEach(process => {
    const modality = data.modalities.find(m => m.id === process.modalityId);
    const user = data.users.find(u => u.id === process.responsibleId);
    const source = data.sources.find(s => s.id === process.sourceId);
    
    // Escape commas in text fields
    const description = `"${process.description.replace(/"/g, '""')}"`;
    
    csv += [
      process.pbdocNumber,
      description,
      modality?.name || `Modalidade ${process.modalityId}`,
      `Fonte ${source?.code || process.sourceId}`,
      user?.fullName || `Usuário ${process.responsibleId}`,
      getProcessStatusLabel(process.status),
      getProcessPriorityLabel(process.priority),
      new Date(process.createdAt).toLocaleDateString()
    ].join(',') + '\n';
  });
  
  return csv;
}

/**
 * Generate CSV for users report
 */
function generateUserCsv(data: ReportData): string {
  // Create headers
  let csv = 'Nome,Usuário,Setor,Perfil,Processos,Concluídos,Taxa\n';
  
  // Get process stats for each user
  data.users.forEach(user => {
    const userProcesses = data.processes.filter(p => p.responsibleId === user.id);
    const completed = userProcesses.filter(p => p.status === 'completed').length;
    const percentage = userProcesses.length > 0 ? Math.round((completed / userProcesses.length) * 100) : 0;
    
    csv += [
      `"${user.fullName}"`,
      user.username,
      user.department,
      user.role === 'admin' ? 'Administrador' : 'Comum',
      userProcesses.length,
      completed,
      `${percentage}%`
    ].join(',') + '\n';
  });
  
  return csv;
}

/**
 * Generate CSV for departments report
 */
function generateDepartmentCsv(data: ReportData): string {
  if (!data.departments) return '';
  
  // Create headers
  let csv = 'Setor,Descrição,Usuários,Processos,Concluídos,Taxa\n';
  
  // Process data for each department
  data.departments.forEach(dept => {
    const deptUsers = data.users.filter(u => u.department === dept.name);
    const deptProcesses = data.processes.filter(p => {
      const user = data.users.find(u => u.id === p.responsibleId);
      return user?.department === dept.name;
    });
    
    const completed = deptProcesses.filter(p => p.status === 'completed').length;
    const percentage = deptProcesses.length > 0 ? Math.round((completed / deptProcesses.length) * 100) : 0;
    
    csv += [
      `"${dept.name}"`,
      `"${dept.description || '-'}"`,
      deptUsers.length,
      deptProcesses.length,
      completed,
      `${percentage}%`
    ].join(',') + '\n';
  });
  
  return csv;
}
