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
 * Generate PDF report
 */
export function generatePdfReport(data: ReportData): void {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(18);
  doc.text('SEAP-PB - Secretaria de Estado da Administração Penitenciária', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Sistema de Controle de Processos de Licitação', 105, 25, { align: 'center' });
  
  // Add report title based on type
  doc.setFontSize(16);
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
  
  // Add filters information
  doc.setFontSize(10);
  let filterText = 'Filtros: ';
  
  if (data.filters.department && data.departments) {
    const departmentId = parseInt(data.filters.department);
    const department = data.departments.find(d => d.id === departmentId);
    filterText += `Setor: ${department?.name || 'Todos'}, `;
  } else {
    filterText += 'Setor: Todos, ';
  }
  
  if (data.filters.month) {
    const monthIndex = parseInt(data.filters.month) - 1;
    filterText += `Mês: ${MONTHS[monthIndex]}, `;
  } else {
    filterText += 'Mês: Todos, ';
  }
  
  filterText += `Ano: ${data.filters.year || 'Todos'}`;
  doc.text(filterText, 105, 50, { align: 'center' });
  
  // Generate table based on report type
  switch (data.reportType) {
    case 'processes':
      generateProcessReport(doc, data);
      break;
    case 'users':
      generateUserReport(doc, data);
      break;
    case 'departments':
      generateDepartmentReport(doc, data);
      break;
  }
  
  // Add footer
  const date = new Date();
  doc.setFontSize(10);
  doc.text(`Gerado em: ${date.toLocaleDateString()} às ${date.toLocaleTimeString()}`, 105, 285, { align: 'center' });
  
  // Download the report
  doc.save(`relatorio-${data.reportType}-${date.getTime()}.pdf`);
}

/**
 * Generate process report table
 */
function generateProcessReport(doc: jsPDF, data: ReportData): void {
  const filteredProcesses = filterReportData(data);
  
  const tableData = filteredProcesses.map(process => {
    const modality = data.modalities.find(m => m.id === process.modalityId);
    const user = data.users.find(u => u.id === process.responsibleId);
    const source = data.sources.find(s => s.id === process.sourceId);
    
    return [
      process.pbdocNumber,
      process.description.length > 30 ? process.description.substring(0, 30) + '...' : process.description,
      modality?.name || `Modalidade ${process.modalityId}`,
      `Fonte ${source?.code || process.sourceId}`,
      user?.fullName || `Usuário ${process.responsibleId}`,
      getProcessStatusLabel(process.status),
      getProcessPriorityLabel(process.priority),
      new Date(process.createdAt).toLocaleDateString()
    ];
  });
  
  autoTable(doc, {
    head: [['PBDOC', 'Descrição', 'Modalidade', 'Fonte', 'Responsável', 'Status', 'Prioridade', 'Criado em']],
    body: tableData,
    startY: 60,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 60 },
  });
}

/**
 * Generate user report table
 */
function generateUserReport(doc: jsPDF, data: ReportData): void {
  // Get process stats for each user
  const userStats = data.users.map(user => {
    const userProcesses = data.processes.filter(p => p.responsibleId === user.id);
    const completed = userProcesses.filter(p => p.status === 'completed').length;
    const percentage = userProcesses.length > 0 ? Math.round((completed / userProcesses.length) * 100) : 0;
    
    return {
      user,
      total: userProcesses.length,
      completed,
      percentage
    };
  });
  
  const tableData = userStats.map(stats => [
    stats.user.fullName,
    stats.user.username,
    stats.user.department,
    stats.user.role === 'admin' ? 'Administrador' : 'Comum',
    stats.total.toString(),
    stats.completed.toString(),
    `${stats.percentage}%`
  ]);
  
  autoTable(doc, {
    head: [['Nome', 'Usuário', 'Setor', 'Perfil', 'Processos', 'Concluídos', 'Taxa']],
    body: tableData,
    startY: 60,
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 60 },
  });
}

/**
 * Generate department report table
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
