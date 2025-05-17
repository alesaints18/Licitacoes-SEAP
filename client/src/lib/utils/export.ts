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
 * Filter data based on report filters
 */
function filterReportData(data: ReportData): Process[] {
  let filteredProcesses = [...data.processes];
  
  // Filter by month if specified
  if (data.filters.month && data.filters.month !== "all") {
    const monthIndex = parseInt(data.filters.month) - 1;
    filteredProcesses = filteredProcesses.filter(process => {
      const processMonth = new Date(process.createdAt).getMonth();
      return processMonth === monthIndex;
    });
  }
  
  // Filter by year if specified
  if (data.filters.year) {
    const year = parseInt(data.filters.year);
    filteredProcesses = filteredProcesses.filter(process => {
      const processYear = new Date(process.createdAt).getFullYear();
      return processYear === year;
    });
  }
  
  // Filter by department if specified
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
 * Generate PDF report with charts
 */
export function generatePdfReport(data: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - (2 * margin);
  
  // Add header with logo
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102); // Azul institucional
  doc.text('SEAP-PB - Secretaria de Estado da Administração Penitenciária', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Sistema de Controle de Processos de Licitação', 105, 25, { align: 'center' });
  
  // Add report title based on type
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Azul institucional
  let reportTitle = '';
  switch (data.reportType) {
    case 'processes':
      reportTitle = 'Relatório de Processos de Licitação';
      break;
    case 'users':
      reportTitle = 'Relatório de Usuários';
      break;
    case 'departments':
      reportTitle = 'Relatório de Setores';
      break;
  }
  doc.text(reportTitle, 105, 40, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Add timestamp and filter information
  const now = new Date();
  doc.setFontSize(10);
  doc.text(`Gerado em: ${now.toLocaleString('pt-BR')}`, margin, 55);
  
  let filterText = 'Filtros: ';
  if (data.filters.department && data.filters.department !== 'all') {
    const deptId = parseInt(data.filters.department);
    const dept = data.departments?.find(d => d.id === deptId);
    filterText += `Setor: ${dept?.name || deptId}; `;
  }
  if (data.filters.month && data.filters.month !== 'all') {
    const monthIndex = parseInt(data.filters.month) - 1;
    filterText += `Mês: ${MONTHS[monthIndex]}; `;
  }
  if (data.filters.year) {
    filterText += `Ano: ${data.filters.year}; `;
  }
  
  doc.text(filterText, margin, 60);
  
  try {
    // Capturar os gráficos da página
    const chartContainers = document.querySelectorAll('.recharts-wrapper');
    
    if (chartContainers.length > 0) {
      let currentY = 70;
      
      // Processar cada gráfico
      for (let i = 0; i < chartContainers.length; i++) {
        const chartContainer = chartContainers[i];
        const svg = chartContainer.querySelector('svg');
        
        if (svg) {
          const chartTitle = document.querySelector(`.recharts-wrapper:nth-child(${i+1})`)
            ?.closest('.card')
            ?.querySelector('.card-title')
            ?.textContent || `Gráfico ${i+1}`;
          
          // Verificar se precisamos de uma nova página
          if (i > 0 && currentY + 100 > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
          }
          
          // Adicionar título do gráfico
          doc.setFontSize(12);
          doc.setTextColor(0, 51, 102);
          doc.text(chartTitle, 105, currentY, { align: 'center' });
          currentY += 10;
          
          // Converter SVG para canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const bounds = svg.getBoundingClientRect();
          
          canvas.width = bounds.width;
          canvas.height = bounds.height;
          
          if (ctx) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            
            // Criar um objeto Blob com o SVG
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            // Desenhar no canvas e adicionar ao PDF
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img, 0, 0);
            doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, usableWidth, 70);
            
            currentY += 85; // Altura do gráfico + margem
            URL.revokeObjectURL(url);
          }
        }
      }
    }
    
    // Adicionar tabela de dados
    doc.addPage();
    const filteredProcesses = filterReportData(data);
    
    // Título da tabela
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Dados Detalhados', 105, margin, { align: 'center' });
    
    if (data.reportType === 'processes') {
      const tableData = filteredProcesses.map(process => {
        const modality = data.modalities.find(m => m.id === process.modalityId);
        const user = data.users.find(u => u.id === process.responsibleId);
        
        return [
          process.pbdocNumber,
          process.description.length > 30 ? process.description.substring(0, 30) + '...' : process.description,
          modality?.name || `Modalidade ${process.modalityId}`,
          user?.fullName || `Usuário ${process.responsibleId}`,
          getProcessStatusLabel(process.status),
          getProcessPriorityLabel(process.priority),
          new Date(process.createdAt).toLocaleDateString('pt-BR')
        ];
      });
      
      autoTable(doc, {
        startY: margin + 10,
        head: [['PBDOC', 'Descrição', 'Modalidade', 'Responsável', 'Status', 'Prioridade', 'Data Criação']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { top: margin, right: margin, bottom: margin, left: margin }
      });
    } else if (data.reportType === 'users') {
      const tableData = data.users.map(user => {
        return [
          user.fullName,
          user.username,
          user.department,
          user.role === 'admin' ? 'Administrador' : 'Comum',
          user.isActive ? 'Ativo' : 'Inativo',
          user.email || 'N/A'
        ];
      });
      
      autoTable(doc, {
        startY: margin + 10,
        head: [['Nome', 'Usuário', 'Setor', 'Função', 'Status', 'Email']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { top: margin, right: margin, bottom: margin, left: margin }
      });
    } else if (data.reportType === 'departments' && data.departments) {
      const tableData = data.departments.map(dept => {
        const usersInDept = data.users.filter(u => u.department === dept.name);
        return [
          dept.name,
          dept.description || 'N/A',
          usersInDept.length.toString(),
          usersInDept.filter(u => u.isActive).length.toString()
        ];
      });
      
      autoTable(doc, {
        startY: margin + 10,
        head: [['Nome', 'Descrição', 'Total Usuários', 'Usuários Ativos']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { top: margin, right: margin, bottom: margin, left: margin }
      });
    }
    
    // Adicionar rodapé em todas as páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `SEAP-PB - Sistema de Controle de Processos de Licitação - Página ${i} de ${pageCount}`,
        105,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    // Salvar o PDF
    doc.save(`relatorio_${data.reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Error generating PDF report:', error);
  }
}

/**
 * Exporta o dataset para arquivo Excel
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
