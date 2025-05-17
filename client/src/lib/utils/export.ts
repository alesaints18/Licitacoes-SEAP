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
 * Formato baseado no exemplo fornecido na imagem
 */
export function generatePdfReport(data: ReportData): void {
  try {
    // Criar novo documento PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const usableWidth = pageWidth - (2 * margin);
    
    // Filtrar processos baseado nos critérios
    const filteredProcesses = filterReportData(data);
    const total = filteredProcesses.length || 1;
    
    // CABEÇALHO DO RELATÓRIO
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('QUANTIDADE DE PROCESSOS', margin, 25);
    
    // Botão de filtros
    doc.setFillColor(30, 144, 255);
    doc.roundedRect(pageWidth - margin - 30, 18, 30, 10, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Filtros', pageWidth - margin - 15, 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Layout do relatório
    const startY = 40;
    const chartHeight = 80;
    const chartWidth = (usableWidth - 20) / 3;
    
    // SEÇÃO 1: GRÁFICO DE PRIORIDADE
    doc.setFontSize(10);
    doc.text('Grau de Prioridade', margin + chartWidth/2, startY, { align: 'center' });
    
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
    
    // Calcular percentuais
    const highPct = priorityCounts.high / total;
    const mediumPct = priorityCounts.medium / total;
    const lowPct = priorityCounts.low / total;
    
    // Desenhar gráfico de rosca
    const centerX1 = margin + chartWidth/2;
    const centerY1 = startY + 40;
    const outerRadius = 25;
    const innerRadius = 12;
    
    // Desenhar gráfico de rosca de prioridades
    drawDonut(doc, centerX1, centerY1, innerRadius, outerRadius, [
      { value: priorityCounts.high, color: [67, 160, 71] },  // Alta - Verde
      { value: priorityCounts.medium, color: [255, 193, 7] }, // Média - Amarelo
      { value: priorityCounts.low, color: [66, 165, 245] }   // Baixa - Azul
    ]);
    
    // Adicionar percentuais
    doc.setFontSize(8);
    doc.text(`${Math.round(highPct * 100)}%`, centerX1 - 20, centerY1 + 50);
    doc.text(`${Math.round(mediumPct * 100)}%`, centerX1, centerY1 + 50);
    doc.text(`${Math.round(lowPct * 100)}%`, centerX1 + 20, centerY1 + 50);
    
    // SEÇÃO 2: GRÁFICO DE STATUS
    doc.setFontSize(10);
    doc.text('Status', margin + chartWidth + 10 + chartWidth/2, startY, { align: 'center' });
    
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
    
    // Calcular percentuais
    const completedPct = statusCounts.completed / total;
    const inProgressPct = statusCounts.in_progress / total;
    
    // Centro do gráfico de status
    const centerX2 = margin + chartWidth + 10 + chartWidth/2;
    const centerY2 = centerY1;
    
    // Desenhar gráfico de rosca de status
    drawDonut(doc, centerX2, centerY2, innerRadius, outerRadius, [
      { value: statusCounts.completed, color: [67, 160, 71] },   // Concluído - Verde
      { value: statusCounts.in_progress, color: [66, 165, 245] } // Em andamento - Azul
    ]);
    
    // Adicionar legendas de status
    doc.setFontSize(6);
    doc.text("CONCLUÍDOS", centerX2 - 35, centerY2 - 20);
    doc.text("EM ANDAMENTO", centerX2 + 15, centerY2 - 20);
    
    // Adicionar percentuais
    doc.setFontSize(8);
    doc.text(`${Math.round(completedPct * 100)}%`, centerX2 - 15, centerY2 + 50);
    doc.text(`${Math.round(inProgressPct * 100)}%`, centerX2 + 15, centerY2 + 50);
    
    // SEÇÃO 3: GRÁFICO DE FONTES (BARRAS HORIZONTAIS)
    doc.setFontSize(10);
    doc.text('Fonte', margin + 2*chartWidth + 20 + chartWidth/2, startY, { align: 'center' });
    
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
      
      // Desenhar barra
      doc.setFillColor(44, 123, 182);
      doc.rect(barStartX, barStartY + index * barGap, barWidth, barHeight, 'F');
      
      // Adicionar label e valor
      doc.setFontSize(7);
      const sourceLabel = source?.code || `ID ${sourceId}`;
      doc.text(sourceLabel, barStartX - 5, barStartY + index * barGap + barHeight/2 + 2, { align: 'right' });
      doc.text(`${count}`, barStartX + barWidth + 3, barStartY + index * barGap + barHeight/2 + 2);
    });
    
    // Adicionar título "Responsável (Qtde)"
    doc.setFontSize(9);
    doc.text('Responsável (Qtde)', barStartX + barMaxWidth/2, barStartY + 5*barGap + 10, { align: 'center' });
    
    // SEÇÃO 4: GRÁFICO DE LINHA (CONCLUSÃO POR MÊS)
    const lineChartY = startY + chartHeight + 20;
    doc.setFontSize(10);
    doc.text('Conclusão de Processos / Mês', margin + usableWidth/2, lineChartY, { align: 'center' });
    
    // Configuração do gráfico de linha
    const lineStartX = margin + 10;
    const lineEndX = pageWidth - margin - 10;
    const lineY = lineChartY + 40;
    const lineWidth = lineEndX - lineStartX;
    
    // Desenhar linha base
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(lineStartX, lineY, lineEndX, lineY);
    
    // Dados fictícios para o gráfico de linha
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
    
    // Desenhar o gráfico de linha
    const linePoints: {x: number, y: number}[] = [];
    const segmentWidth = lineWidth / (monthlyValues.length - 1);
    
    monthlyValues.forEach((mv, index) => {
      const x = lineStartX + (index * segmentWidth);
      const y = lineY - (mv.value * valueScale);
      linePoints.push({ x, y });
      
      // Desenhar ponto
      doc.setFillColor(54, 162, 235);
      doc.circle(x, y, 1.5, 'F');
      
      // Adicionar label do mês
      doc.setFontSize(6);
      doc.text(mv.month, x, lineY + 7, { align: 'center' });
    });
    
    // Desenhar linhas entre pontos
    doc.setDrawColor(54, 162, 235);
    doc.setLineWidth(0.8);
    for (let i = 0; i < linePoints.length - 1; i++) {
      doc.line(linePoints[i].x, linePoints[i].y, linePoints[i+1].x, linePoints[i+1].y);
    }
    
    // Salvar o PDF
    doc.save(`relatorio_processos_${new Date().toISOString().slice(0, 10)}.pdf`);
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
