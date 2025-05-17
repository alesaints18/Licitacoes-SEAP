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
    // Adicionar um título para a seção de gráficos
    let currentY = 70;
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text('Análise Visual de Dados', 105, currentY, { align: 'center' });
    currentY += 15;
    
    // Vamos criar gráficos simples diretamente no PDF em vez de capturar dos elementos
    if (data.reportType === 'processes') {
      // Crie um gráfico simples por status
      doc.setFontSize(12);
      doc.text('Processos por Status', 105, currentY, { align: 'center' });
      currentY += 10;
      
      // Calcular estatísticas
      const statusCounts = {
        draft: 0,
        in_progress: 0,
        completed: 0,
        canceled: 0
      };
      
      const filteredProcesses = filterReportData(data);
      
      // Contar processos por status
      filteredProcesses.forEach(process => {
        if (process.status in statusCounts) {
          statusCounts[process.status]++;
        }
      });
      
      // Desenhar barras coloridas para cada status
      const barHeight = 20;
      const barSpace = 30;
      const barMaxWidth = usableWidth - 80;
      const total = filteredProcesses.length || 1; // Evitar divisão por zero
      
      // Status: Rascunho
      doc.setFillColor(200, 200, 200); // Cinza
      const draftWidth = (statusCounts.draft / total) * barMaxWidth;
      doc.text('Rascunho:', margin, currentY + 5);
      doc.rect(margin + 50, currentY, draftWidth, barHeight, 'F');
      doc.text(`${statusCounts.draft} (${Math.round((statusCounts.draft / total) * 100)}%)`, margin + draftWidth + 55, currentY + 5);
      currentY += barSpace;
      
      // Status: Em Andamento
      doc.setFillColor(255, 193, 7); // Amarelo
      const inProgressWidth = (statusCounts.in_progress / total) * barMaxWidth;
      doc.text('Em Andamento:', margin, currentY + 5);
      doc.rect(margin + 50, currentY, inProgressWidth, barHeight, 'F');
      doc.text(`${statusCounts.in_progress} (${Math.round((statusCounts.in_progress / total) * 100)}%)`, margin + inProgressWidth + 55, currentY + 5);
      currentY += barSpace;
      
      // Status: Concluído
      doc.setFillColor(40, 167, 69); // Verde
      const completedWidth = (statusCounts.completed / total) * barMaxWidth;
      doc.text('Concluído:', margin, currentY + 5);
      doc.rect(margin + 50, currentY, completedWidth, barHeight, 'F');
      doc.text(`${statusCounts.completed} (${Math.round((statusCounts.completed / total) * 100)}%)`, margin + completedWidth + 55, currentY + 5);
      currentY += barSpace;
      
      // Status: Cancelado
      doc.setFillColor(220, 53, 69); // Vermelho
      const canceledWidth = (statusCounts.canceled / total) * barMaxWidth;
      doc.text('Cancelado:', margin, currentY + 5);
      doc.rect(margin + 50, currentY, canceledWidth, barHeight, 'F');
      doc.text(`${statusCounts.canceled} (${Math.round((statusCounts.canceled / total) * 100)}%)`, margin + canceledWidth + 55, currentY + 5);
      currentY += barSpace + 10;
      
      // Adicionar gráfico por modalidade se tiver espaço
      if (currentY + 100 < pageHeight - margin) {
        doc.text('Processos por Modalidade', 105, currentY, { align: 'center' });
        currentY += 10;
        
        // Contagem por modalidade
        const modalityCounts = {};
        filteredProcesses.forEach(process => {
          const modalityId = process.modalityId;
          if (!modalityCounts[modalityId]) {
            modalityCounts[modalityId] = 0;
          }
          modalityCounts[modalityId]++;
        });
        
        // Desenhar barras para cada modalidade
        Object.keys(modalityCounts).forEach(modalityId => {
          const modalityIdNum = parseInt(modalityId);
          const modality = data.modalities.find(m => m.id === modalityIdNum);
          const count = modalityCounts[modalityId];
          const width = (count / total) * barMaxWidth;
          
          doc.setFillColor(0, 123, 255); // Azul
          doc.text(`${modality?.name || `Modalidade ${modalityId}`}:`, margin, currentY + 5);
          doc.rect(margin + 80, currentY, width, barHeight, 'F');
          doc.text(`${count} (${Math.round((count / total) * 100)}%)`, margin + width + 85, currentY + 5);
          currentY += barSpace;
        });
      }
    } else if (data.reportType === 'users') {
      // Adicionar gráfico de usuários ativos vs. inativos
      doc.text('Status dos Usuários', 105, currentY, { align: 'center' });
      currentY += 10;
      
      const activeUsers = data.users.filter(u => u.isActive).length;
      const inactiveUsers = data.users.length - activeUsers;
      const total = data.users.length || 1;
      
      const barHeight = 20;
      const barSpace = 30;
      const barMaxWidth = usableWidth - 80;
      
      // Usuários ativos
      doc.setFillColor(40, 167, 69); // Verde
      const activeWidth = (activeUsers / total) * barMaxWidth;
      doc.text('Ativos:', margin, currentY + 5);
      doc.rect(margin + 50, currentY, activeWidth, barHeight, 'F');
      doc.text(`${activeUsers} (${Math.round((activeUsers / total) * 100)}%)`, margin + activeWidth + 55, currentY + 5);
      currentY += barSpace;
      
      // Usuários inativos
      doc.setFillColor(220, 53, 69); // Vermelho
      const inactiveWidth = (inactiveUsers / total) * barMaxWidth;
      doc.text('Inativos:', margin, currentY + 5);
      doc.rect(margin + 50, currentY, inactiveWidth, barHeight, 'F');
      doc.text(`${inactiveUsers} (${Math.round((inactiveUsers / total) * 100)}%)`, margin + inactiveWidth + 55, currentY + 5);
      currentY += barSpace + 10;
      
      // Adicionar gráfico de usuários por setor se tiver espaço
      if (currentY + 100 < pageHeight - margin) {
        doc.text('Usuários por Setor', 105, currentY, { align: 'center' });
        currentY += 10;
        
        // Contagem por setor
        const departmentCounts = {};
        data.users.forEach(user => {
          const dept = user.department;
          if (!departmentCounts[dept]) {
            departmentCounts[dept] = 0;
          }
          departmentCounts[dept]++;
        });
        
        // Desenhar barras para cada setor
        Object.keys(departmentCounts).forEach(dept => {
          const count = departmentCounts[dept];
          const width = (count / total) * barMaxWidth;
          
          doc.setFillColor(0, 123, 255); // Azul
          doc.text(`${dept}:`, margin, currentY + 5);
          const textWidth = doc.getTextWidth(`${dept}:`);
          doc.rect(margin + Math.max(50, textWidth + 5), currentY, width, barHeight, 'F');
          doc.text(`${count} (${Math.round((count / total) * 100)}%)`, margin + width + Math.max(55, textWidth + 10), currentY + 5);
          currentY += barSpace;
        });
      }
    } else if (data.reportType === 'departments' && data.departments) {
      // Adicionar gráfico de processos por setor
      doc.text('Processos por Setor', 105, currentY, { align: 'center' });
      currentY += 10;
      
      // Criar contagem de processos por setor
      const deptProcessCounts = {};
      data.departments.forEach(dept => {
        const deptUsers = data.users.filter(u => u.department === dept.name);
        let count = 0;
        
        deptUsers.forEach(user => {
          count += data.processes.filter(p => p.responsibleId === user.id).length;
        });
        
        deptProcessCounts[dept.name] = count;
      });
      
      // Determinar o total para percentuais
      const totalProcesses = Object.values(deptProcessCounts).reduce((sum: number, count: number) => sum + count, 0) || 1;
      
      // Configurações para as barras
      const barHeight = 20;
      const barSpace = 30;
      const barMaxWidth = usableWidth - 80;
      
      // Desenhar barras para cada setor
      Object.keys(deptProcessCounts).forEach(deptName => {
        const count = deptProcessCounts[deptName];
        if (count > 0) { // Só mostrar setores com processos
          const width = (count / totalProcesses) * barMaxWidth;
          
          doc.setFillColor(0, 123, 255); // Azul
          doc.text(`${deptName}:`, margin, currentY + 5);
          const textWidth = doc.getTextWidth(`${deptName}:`);
          doc.rect(margin + Math.max(50, textWidth + 5), currentY, width, barHeight, 'F');
          doc.text(`${count} (${Math.round((count / totalProcesses) * 100)}%)`, margin + width + Math.max(55, textWidth + 10), currentY + 5);
          currentY += barSpace;
        }
      });
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
