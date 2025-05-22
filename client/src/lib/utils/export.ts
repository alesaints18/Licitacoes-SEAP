import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";
import { MONTHS } from '../constants';
import { getProcessStatusLabel, getProcessPriorityLabel } from './process';
import autoTable from 'jspdf-autotable';

// Tipos para os relatórios
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
    
    // Adicionar fundo escuro em toda a página - similar à imagem referência
    doc.setFillColor(60, 64, 75); // Cor de fundo cinza escuro
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Filtrar processos baseado nos critérios
    const filteredProcesses = filterReportData(data);
    const total = filteredProcesses.length || 1;
    
    // == TÍTULO COM SOMBRA SUAVE ==
    doc.setFontSize(28);
    
    // Efeito de sombra (título principal) - texto ligeiramente translúcido em offset
    doc.setTextColor(220, 220, 220, 0.5);
    doc.text('Timeline Infográfico', pageWidth / 2 + 1, 26, { align: 'center' });
    
    // Texto principal (título)
    doc.setTextColor(255, 255, 255);
    doc.text('Timeline Infográfico', pageWidth / 2, 25, { align: 'center' });
    
    // TIMELINE PRINCIPAL - linha do tempo horizontal
    const timelineY = 70;
    const timelineStartX = margin + 20;
    const timelineEndX = pageWidth - margin - 20;
    const timelineWidth = timelineEndX - timelineStartX;
    
    // Períodos para a timeline - configurados para representar anos
    const periods = [
      { 
        label: 'Inicialização', 
        year: '1980', 
        color: [41, 121, 255],  // Azul
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2021).length,
        description: 'Aenean sodales congue\nnisi sed imperdiet. Donec\ndapibus egent sem ac ornare.',
        chartData: [10, 15, 12, 18, 14, 20]
      },
      { 
        label: 'Progresso', 
        year: '1990', 
        color: [255, 99, 132],  // Rosa/Vermelho
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2022).length,
        description: 'Cras est tortor est. Ut\nvehicula vel placerat,\nvestibulum eget, placerat\nligula mauris.',
        chartData: [15, 22, 18, 25, 20, 28]
      },
      { 
        label: 'Expansão', 
        year: '2000', 
        color: [132, 255, 99],  // Verde
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2023).length,
        description: 'In eunisus magna, faucibus\negest erat nunc, tempus\nrhoncus diam. Phasellus\nac, este felis.',
        chartData: [22, 28, 25, 32, 30, 35]
      },
      { 
        label: 'Inovação', 
        year: '2010', 
        color: [255, 205, 0],  // Amarelo
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2024).length,
        description: 'Fusce egestus, nisl at\nlobortis vulputate, velit erat\nconque lactur, et amet\nluctus risus enim\nid nulla.',
        chartData: [25, 30, 35, 40, 38, 42]
      },
      { 
        label: 'Excelência', 
        year: '2020', 
        color: [255, 149, 0],  // Laranja
        stats: filteredProcesses.filter(p => new Date(p.createdAt).getFullYear() === 2025).length,
        description: 'Cras et allocicitude nulla,\nsapien dolor, semper lac,\nsapien eu tincidunt felis.',
        chartData: [30, 35, 42, 48, 45, 52]
      }
    ];
    
    // === LINHA DO TEMPO CENTRAL ===
    const segmentColors = [
      [41, 121, 255],  // Azul
      [255, 99, 132],  // Rosa/Vermelho 
      [132, 255, 99],  // Verde
      [255, 205, 0],   // Amarelo
      [255, 149, 0]    // Laranja
    ];
    
    // Linha base cinza para a linha do tempo completa
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(8);
    doc.line(timelineStartX, timelineY, timelineEndX, timelineY);
    
    // Calcular largura de cada segmento
    const segmentWidth = timelineWidth / periods.length;
    
    // Desenhar os segmentos coloridos da linha do tempo
    periods.forEach((period, index) => {
      const segmentStartX = timelineStartX + (segmentWidth * index);
      const segmentEndX = segmentStartX + segmentWidth;
      
      // Desenhar segmento colorido
      doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
      doc.setLineWidth(8);
      doc.line(segmentStartX, timelineY, segmentEndX, timelineY);
      
      // Adicionar círculo no início do segmento
      doc.setFillColor(255, 255, 255);
      doc.circle(segmentStartX, timelineY, 6, 'F');
      doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
      doc.setLineWidth(2);
      doc.circle(segmentStartX, timelineY, 6, 'S');
      
      // Se for o último, adicionar círculo no final
      if (index === periods.length - 1) {
        doc.setFillColor(255, 255, 255);
        doc.circle(segmentEndX, timelineY, 6, 'F');
        doc.setDrawColor(period.color[0], period.color[1], period.color[2]);
        doc.setLineWidth(2);
        doc.circle(segmentEndX, timelineY, 6, 'S');
      }
    });
    
    // === ADICIONAR CONTEÚDO ACIMA E ABAIXO DA TIMELINE ===
    
    periods.forEach((period, index) => {
      const x = timelineStartX + (segmentWidth * index) + (segmentWidth / 2);
      const isEvenPeriod = index % 2 === 0;
      
      // Ano em grande destaque
      doc.setFontSize(24);
      doc.setTextColor(period.color[0], period.color[1], period.color[2]);
      doc.setFontStyle('bold');
      doc.text(period.year, x, timelineY + (isEvenPeriod ? 50 : -35), { align: 'center' });
      
      // Definir onde desenhar o gráfico de barras e o texto descritivo
      let chartY, descriptionY, circleY;
      
      if (isEvenPeriod) {
        // Conteúdo abaixo da timeline
        chartY = timelineY + 25;
        descriptionY = timelineY + 75;
        circleY = timelineY + 115;
      } else {
        // Conteúdo acima da timeline
        chartY = timelineY - 65;
        descriptionY = timelineY - 25;
        circleY = timelineY - 115;
      }
      
      // Desenhar gráfico de barras
      let barWidth = 7;
      let barGap = 2;
      let chartStartX = x - ((barWidth + barGap) * period.chartData.length / 2);
      
      // Encontrar valor máximo para escala do gráfico
      const maxValue = Math.max(...period.chartData);
      
      // Desenhar barras do gráfico de período
      period.chartData.forEach((value, i) => {
        const barHeight = (value / maxValue) * 40; // altura máxima de 40mm
        const barX = chartStartX + (i * (barWidth + barGap));
        
        // Cores alternadas da mesma família de cores
        if (i % 2 === 0) {
          doc.setFillColor(period.color[0], period.color[1], period.color[2]);
        } else {
          doc.setFillColor(
            Math.min(255, period.color[0] + 40),
            Math.min(255, period.color[1] + 40),
            Math.min(255, period.color[2] + 40)
          );
        }
        
        if (isEvenPeriod) {
          // Barras crescendo para baixo
          doc.rect(barX, chartY, barWidth, barHeight, 'F');
        } else {
          // Barras crescendo para cima
          doc.rect(barX, chartY, barWidth, -barHeight, 'F');
        }
      });
      
      // Texto descritivo
      doc.setFontSize(9);
      doc.setTextColor(220, 220, 220);
      doc.setFontStyle('normal');
      doc.text(period.description, x, descriptionY, { 
        align: 'center',
        maxWidth: segmentWidth - 20
      });
      
      // Círculo com gráfico de pizza/donut
      const circleRadius = 20;
      
      // Desenhar círculo principal
      doc.setFillColor(period.color[0], period.color[1], period.color[2]);
      doc.circle(x, circleY, circleRadius, 'F');
      
      // Segmentos decorativos no círculo
      const numSegments = 3;
      for(let i = 0; i < numSegments; i++) {
        const segAngle = (2 * Math.PI / numSegments) * i;
        const segX = x + (circleRadius * 0.6) * Math.cos(segAngle);
        const segY = circleY + (circleRadius * 0.6) * Math.sin(segAngle);
        
        // Cores alternadas
        doc.setFillColor(
          Math.min(255, period.color[0] + 60 + (i * 20)),
          Math.min(255, period.color[1] + 60 + (i * 20)),
          Math.min(255, period.color[2] + 60 + (i * 20))
        );
        doc.circle(segX, segY, circleRadius * 0.4, 'F');
      }
      
      // Círculo branco no centro
      doc.setFillColor(60, 64, 75); // Mesma cor do fundo
      doc.circle(x, circleY, circleRadius * 0.5, 'F');
      
      // Texto com estatísticas
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFontStyle('bold');
      doc.text(`${period.stats || 0}`, x, circleY + 4, { align: 'center' });
    });
    
    // Rodapé com informações de geração
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.setFontStyle('normal');
    doc.text(`SEAP-PB | Sistema de Controle de Processos Licitatórios | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 
      pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar o PDF
    doc.save(`timeline-processos-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`);
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
