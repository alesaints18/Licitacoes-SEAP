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
 * Gera um relatório PDF em formato de linha do tempo (timeline)
 * Inspirado no modelo de infográfico moderno
 */
export function generatePdfReport(data: ReportData): void {
  try {
    // Criar novo documento PDF com fundo escuro como na imagem de referência
    const doc = new jsPDF({ 
      orientation: 'landscape',
      unit: 'mm'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    // Adicionar fundo escuro em toda a página
    doc.setFillColor(60, 64, 75); // Cor de fundo cinza escuro similar à imagem
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Filtrar processos baseado nos critérios
    const filteredProcesses = filterReportData(data);
    const total = filteredProcesses.length || 1;
    
    // == TÍTULO COM EFEITO DE SOMBRA ==
    doc.setFontSize(28);
    
    // Texto com efeito de sombra (título principal)
    doc.setTextColor(255, 255, 255);
    doc.text('Linha do Tempo - Processos Licitatórios', pageWidth / 2, 25, { align: 'center' });
    
    // TIMELINE PRINCIPAL
    const timelineY = 70;
    const timelineStartX = margin + 20;
    const timelineEndX = pageWidth - margin - 20;
    const timelineWidth = timelineEndX - timelineStartX;
    
    // Períodos para a timeline (adaptar para os períodos relevantes ao seu sistema)
    const periods = [
      { 
        label: 'Planejamento', 
        year: '2022', 
        color: [41, 121, 255],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2022).length,
        description: 'Fase inicial de planejamento e preparação dos processos licitatórios',
        icon: 'clipboard',
        chartData: [10, 15, 12, 18, 14]
      },
      { 
        label: 'Execução', 
        year: '2023', 
        color: [76, 217, 100],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2023).length,
        description: 'Período de execução e implementação dos processos',
        icon: 'cogs',
        chartData: [15, 22, 18, 25, 20]
      },
      { 
        label: 'Avaliação', 
        year: '2024', 
        color: [255, 204, 0],
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2024).length,
        description: 'Etapa de avaliação e revisão dos resultados obtidos',
        icon: 'check',
        chartData: [22, 28, 25, 32, 30]
      },
      { 
        label: 'Consolidação', 
        year: '2025', 
        color: [255, 149, 0],
        stats: 0, // Ano futuro, sem dados ainda
        description: 'Previsão para consolidação dos processos implementados',
        icon: 'star',
        chartData: [25, 30, 35, 40, 38]
      }
    ];
    
    // Desenhar linha do tempo principal
    doc.setLineWidth(3);
    doc.setDrawColor(200, 200, 200);
    doc.line(timelineStartX, timelineY, timelineEndX, timelineY);
    
    // Calcular a largura de cada segmento
    const segmentWidth = timelineWidth / (periods.length);
    
    // Desenhar cada período da timeline
    periods.forEach((period, index) => {
      const x = timelineStartX + (segmentWidth * index) + (segmentWidth / 2);
      
      // Desenhar círculo marcador do período
      const circleX = x;
      const circleY = timelineY;
      const circleRadius = 5;
      
      // Cor do segmento da timeline
      doc.setFillColor(period.color[0], period.color[1], period.color[2]);
      
      // Segmento da timeline
      const segmentStartX = timelineStartX + (segmentWidth * index);
      const segmentEndX = segmentStartX + segmentWidth;
      doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
      doc.setLineWidth(6);
      doc.line(segmentStartX, timelineY, segmentEndX, timelineY);
      
      // Círculo marcador 
      doc.circle(circleX, circleY, circleRadius, 'F');
      
      // Ano (grande)
      doc.setFontSize(24);
      doc.setTextColor(period.color[0], period.color[1], period.color[2]);
      doc.text(period.year, circleX, timelineY + 25, { align: 'center' });
      
      // Título do período (em cima da timeline)
      doc.setFontSize(14);
      doc.setTextColor(250, 250, 250);
      doc.text(period.label, circleX, timelineY - 15, { align: 'center' });
      
      // Estatísticas acima
      const isEvenPeriod = index % 2 === 0;
      let statsY = isEvenPeriod ? timelineY - 40 : timelineY + 40;
      let chartDirection = isEvenPeriod ? 'up' : 'down';
      
      // Gráfico de barras acima/abaixo (alternando)
      const chartX = circleX - 20;
      const chartY = isEvenPeriod ? statsY - 20 : statsY + 10;
      const barWidth = 6;
      const barGap = 2;
      const maxBarHeight = 30;
      
      // Determinar altura máxima das barras
      const maxDataValue = Math.max(...period.chartData);
      
      // Desenhar barras do gráfico
      period.chartData.forEach((value, i) => {
        const barHeight = (value / maxDataValue) * maxBarHeight;
        const barX = chartX + (i * (barWidth + barGap));
        
        // Desenhar barra - cores alternadas da mesma família
        const intensity = 100 + (i * 30);
        doc.setFillColor(
          Math.min(255, period.color[0] + intensity/2), 
          Math.min(255, period.color[1] + intensity/2), 
          Math.min(255, period.color[2] + intensity/2)
        );
        
        if (chartDirection === 'up') {
          // Barras para cima
          doc.rect(barX, chartY - barHeight, barWidth, barHeight, 'F');
        } else {
          // Barras para baixo
          doc.rect(barX, chartY, barWidth, barHeight, 'F');
        }
      });
      
      // Descrição do período (abaixo ou acima, alternando)
      const descriptionY = isEvenPeriod ? timelineY + 70 : timelineY - 60;
      doc.setFontSize(10);
      doc.setTextColor(220, 220, 220);
      doc.text(period.description, circleX, descriptionY, { 
        align: 'center',
        maxWidth: segmentWidth - 10
      });
      
      // Círculo com estatísticas
      const statCircleX = circleX;
      const statCircleY = isEvenPeriod ? timelineY + 90 : timelineY - 80;
      const statCircleRadius = 25;
      
      // Desenhar círculo de estatísticas com segmentos de cores
      doc.setFillColor(period.color[0], period.color[1], period.color[2]);
      doc.circle(statCircleX, statCircleY, statCircleRadius, 'F');
      
      // Adicionar texto ao centro do círculo
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(`${period.stats}`, statCircleX, statCircleY, { align: 'center' });
      
      // Adicionar label abaixo do número
      doc.setFontSize(8);
      doc.text("processos", statCircleX, statCircleY + 8, { align: 'center' });
      
      // Desenhar segmentos decorativos no círculo
      // Segmento 1
      doc.setFillColor(
        Math.min(255, period.color[0] + 40),
        Math.min(255, period.color[1] + 40),
        Math.min(255, period.color[2] + 40)
      );
      doc.circle(statCircleX - statCircleRadius/2, statCircleY - statCircleRadius/2, statCircleRadius/3, 'F');
      
      // Segmento 2
      doc.setFillColor(
        Math.min(255, period.color[0] + 80),
        Math.min(255, period.color[1] + 80),
        Math.min(255, period.color[2] + 80)
      );
      doc.circle(statCircleX + statCircleRadius/2, statCircleY - statCircleRadius/2, statCircleRadius/3, 'F');
    });
    
    // === ESTATÍSTICAS GERAIS ===
    // Adicionar texto descritivo ao topo
    const currentYear = new Date().getFullYear();
    const currentYearProcesses = filteredProcesses.filter(p => 
      new Date(p.createdAt).getFullYear() === currentYear
    ).length;
    
    doc.setFontSize(12);
    doc.setTextColor(180, 180, 180);
    doc.text(`Total de processos até ${currentYear}: ${filteredProcesses.length}`, 
      pageWidth / 2, pageHeight - 20, { align: 'center' });
    
    // Adicionar informações de estatísticas ao rodapé
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Sistema de Controle de Processos de Licitação - SEAP/PB | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 
      pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar o PDF
    doc.save(`linha-tempo-processos-licitatorios-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}

/**
 * Função auxiliar para gerar relatório de departamentos
 */
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
 * Exporta o dataset para arquivo Excel (CSV)
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
    default:
      console.log('Tipo de relatório não especificado');
      alert('Tipo de relatório não especificado. Por favor, selecione um tipo de relatório.');
      return;
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
