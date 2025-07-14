import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";
import htmlPdf from 'html-pdf-node';

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
 * Gera um relatório em PDF moderno, com layout widescreen e estilo contemporâneo
 */
export async function generateModernReport(data: ReportData): Promise<void> {
  try {
    const filteredProcesses = filterReportData(data);
    
    // Status counts
    const statusCounts = {
      draft: filteredProcesses.filter(p => p.status === 'draft').length,
      in_progress: filteredProcesses.filter(p => p.status === 'in_progress').length,
      completed: filteredProcesses.filter(p => p.status === 'completed').length,
      canceled: filteredProcesses.filter(p => p.status === 'canceled').length,
    };
    
    // Estatísticas por modalidade
    const modalityCounts = new Map<number, number>();
    filteredProcesses.forEach(p => {
      const count = modalityCounts.get(p.modalityId) || 0;
      modalityCounts.set(p.modalityId, count + 1);
    });
    
    const modalityData = Array.from(modalityCounts.entries())
      .map(([id, count]) => {
        const modality = data.modalities.find(m => m.id === id);
        return {
          name: modality?.name || `Modalidade ${id}`,
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Processos recentes
    const recentProcesses = filteredProcesses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(p => {
        const modality = data.modalities.find(m => m.id === p.modalityId);
        const responsible = data.users.find(u => u.id === p.responsibleId);
        
        let statusClass = '';
        let statusLabel = '';
        
        switch(p.status) {
          case 'draft':
            statusClass = 'bg-gray-200 text-gray-800';
            statusLabel = 'Rascunho';
            break;
          case 'in_progress':
            statusClass = 'bg-blue-200 text-blue-800';
            statusLabel = 'Em Andamento';
            break;
          case 'completed':
            statusClass = 'bg-green-200 text-green-800';
            statusLabel = 'Concluído';
            break;
          case 'canceled':
            statusClass = 'bg-red-200 text-red-800';
            statusLabel = 'Cancelado';
            break;
        }
        
        return {
          pbdocNumber: p.pbdocNumber,
          description: p.description.length > 60 ? p.description.substring(0, 60) + '...' : p.description,
          modality: modality?.name || 'N/A',
          responsible: responsible?.fullName || 'N/A',
          statusClass,
          statusLabel,
          createdAt: new Date(p.createdAt).toLocaleDateString('pt-BR')
        };
      });
    
    // Estatísticas por fonte
    const sourceCounts = new Map<number, number>();
    filteredProcesses.forEach(p => {
      const count = sourceCounts.get(p.sourceId) || 0;
      sourceCounts.set(p.sourceId, count + 1);
    });
    
    const sourceData = Array.from(sourceCounts.entries())
      .map(([id, count]) => {
        const source = data.sources.find(s => s.id === id);
        return {
          name: source?.code || `Fonte ${id}`,
          description: source?.description || '',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Converte contagens para porcentagens para gráficos
    const maxModalityCount = Math.max(...modalityData.map(m => m.count), 1);
    const modalityChartData = modalityData.map(m => ({
      ...m,
      percentage: Math.round((m.count / maxModalityCount) * 100)
    }));
    
    // Departamento selecionado
    let selectedDepartment = 'Todos';
    if (data.filters.department && data.filters.department !== 'all' && data.departments) {
      const deptId = parseInt(data.filters.department);
      const dept = data.departments.find(d => d.id === deptId);
      if (dept) {
        selectedDepartment = dept.name;
      }
    }
    
    // Gerar o HTML para o relatório
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório SEAP-PB</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
        
        :root {
          --primary: #1e40af;
          --primary-light: #3b82f6;
          --secondary: #10b981;
          --accent: #f59e0b;
          --danger: #ef4444;
          --dark: #1f2937;
          --light: #f9fafb;
          --gray: #F0F9FF;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: var(--dark);
          background-color: var(--light);
          width: 100%;
          max-width: 100%;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Poppins', sans-serif;
          margin-bottom: 0.5rem;
          font-weight: 600;
          line-height: 1.2;
        }
        
        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0;
        }
        
        .header {
          background: linear-gradient(to right, #1e40af, #3b82f6);
          color: white;
          padding: 2rem;
          position: relative;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 0.25rem;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        
        .header-meta {
          display: flex;
          gap: 2rem;
          margin-top: 1rem;
          font-size: 14px;
        }
        
        .logo {
          position: absolute;
          top: 1.5rem;
          right: 2rem;
          max-height: 60px;
          opacity: 0.9;
        }
        
        .dashboard {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          padding: 1.5rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 1rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }
        
        .total-card::before { background-color: var(--primary); }
        .progress-card::before { background-color: var(--primary-light); }
        .completed-card::before { background-color: var(--secondary); }
        .canceled-card::before { background-color: var(--danger); }
        
        .stat-number {
          font-size: 28px;
          font-weight: 700;
          margin: 0.5rem 0;
        }
        
        .stat-label {
          font-size: 14px;
          color: var(--gray);
        }
        
        .chart-section {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .section-title {
          font-size: 18px;
          margin-bottom: 1rem;
          color: var(--dark);
          border-bottom: 1px solid #eee;
          padding-bottom: 0.75rem;
        }
        
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        
        .chart-container {
          min-height: 300px;
          position: relative;
        }
        
        .pie-chart {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          margin: 0 auto;
          background: conic-gradient(
            #10b981 0% ${statusCounts.completed > 0 ? (statusCounts.completed / filteredProcesses.length) * 360 : 0}deg,
            #3b82f6 ${statusCounts.completed > 0 ? (statusCounts.completed / filteredProcesses.length) * 360 : 0}deg ${statusCounts.in_progress > 0 ? ((statusCounts.completed + statusCounts.in_progress) / filteredProcesses.length) * 360 : statusCounts.completed > 0 ? (statusCounts.completed / filteredProcesses.length) * 360 : 0}deg,
            #F0F9FF ${statusCounts.in_progress > 0 ? ((statusCounts.completed + statusCounts.in_progress) / filteredProcesses.length) * 360 : statusCounts.completed > 0 ? (statusCounts.completed / filteredProcesses.length) * 360 : 0}deg ${statusCounts.draft > 0 ? ((statusCounts.completed + statusCounts.in_progress + statusCounts.draft) / filteredProcesses.length) * 360 : (statusCounts.in_progress > 0 ? ((statusCounts.completed + statusCounts.in_progress) / filteredProcesses.length) * 360 : statusCounts.completed > 0 ? (statusCounts.completed / filteredProcesses.length) * 360 : 0)}deg,
            #ef4444 ${statusCounts.draft > 0 ? ((statusCounts.completed + statusCounts.in_progress + statusCounts.draft) / filteredProcesses.length) * 360 : (statusCounts.in_progress > 0 ? ((statusCounts.completed + statusCounts.in_progress) / filteredProcesses.length) * 360 : statusCounts.completed > 0 ? (statusCounts.completed / filteredProcesses.length) * 360 : 0)}deg 360deg
          );
          position: relative;
        }
        
        .pie-chart::before {
          content: '';
          position: absolute;
          width: 120px;
          height: 120px;
          background-color: white;
          border-radius: 50%;
          top: 30px;
          left: 30px;
        }
        
        .legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          margin-right: 8px;
        }
        
        .legend-completed { background-color: #10b981; }
        .legend-progress { background-color: #3b82f6; }
        .legend-draft { background-color: #F0F9FF; }
        .legend-canceled { background-color: #ef4444; }
        
        .bar-chart {
          height: 250px;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          margin-top: 1rem;
        }
        
        .bar {
          width: 60px;
          background-color: #3b82f6;
          border-radius: 6px 6px 0 0;
          position: relative;
          transition: height 0.3s;
        }
        
        .bar-label {
          position: absolute;
          bottom: -25px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 12px;
        }
        
        .bar-value {
          position: absolute;
          top: -25px;
          left: 0;
          right: 0;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
        }
        
        .process-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        
        .process-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background-color: #f9fafb;
          font-weight: 600;
          font-size: 14px;
        }
        
        .process-table td {
          padding: 0.75rem 1rem;
          border-top: 1px solid #f3f4f6;
          font-size: 14px;
        }
        
        .process-table tr:hover td {
          background-color: #f9fafb;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        .footer {
          text-align: center;
          padding: 1.5rem;
          color: var(--gray);
          border-top: 1px solid #f3f4f6;
          font-size: 12px;
        }
        
        /* Responsive - for display in PDF */
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .container {
            width: 1280px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header class="header">
          <h1>Relatório Infográfico SEAP-PB</h1>
          <p>Sistema de Controle de Processos de Licitação</p>
          <div class="header-meta">
            <span>Data: ${new Date().toLocaleDateString('pt-BR')}</span>
            <span>Departamento: ${selectedDepartment}</span>
            <span>Total de processos: ${filteredProcesses.length}</span>
          </div>
          <img src="https://paraiba.pb.gov.br/marca-do-governo/GovPBT.png" alt="Logo do Governo da Paraíba" class="logo">
        </header>
        
        <div class="dashboard">
          <div class="stats-grid" style="grid-column: span 4;">
            <div class="stat-card total-card">
              <div class="stat-number">${filteredProcesses.length}</div>
              <div class="stat-label">Total de Processos</div>
            </div>
            
            <div class="stat-card progress-card">
              <div class="stat-number">${statusCounts.in_progress}</div>
              <div class="stat-label">Em Andamento</div>
            </div>
            
            <div class="stat-card completed-card">
              <div class="stat-number">${statusCounts.completed}</div>
              <div class="stat-label">Concluídos</div>
            </div>
            
            <div class="stat-card canceled-card">
              <div class="stat-number">${statusCounts.canceled}</div>
              <div class="stat-label">Cancelados</div>
            </div>
          </div>
          
          <div class="chart-section" style="grid-column: span 4;">
            <h2 class="section-title">Visão Geral dos Processos</h2>
            
            <div class="chart-grid">
              <div class="chart-container">
                <h3 style="text-align: center; margin-bottom: 1rem;">Distribuição por Status</h3>
                <div class="pie-chart"></div>
                <div class="legend">
                  <div class="legend-item">
                    <div class="legend-color legend-completed"></div>
                    <span>Concluídos (${statusCounts.completed})</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color legend-progress"></div>
                    <span>Em Andamento (${statusCounts.in_progress})</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color legend-draft"></div>
                    <span>Rascunho (${statusCounts.draft})</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color legend-canceled"></div>
                    <span>Cancelados (${statusCounts.canceled})</span>
                  </div>
                </div>
              </div>
              
              <div class="chart-container">
                <h3 style="text-align: center; margin-bottom: 1rem;">Processos por Modalidade</h3>
                <div class="bar-chart">
                  ${modalityChartData.map((modality, index) => `
                    <div class="bar" style="height: ${modality.percentage}%; background-color: ${index % 2 === 0 ? '#3b82f6' : '#4f46e5'};">
                      <div class="bar-value">${modality.count}</div>
                      <div class="bar-label">${modality.name.substring(0, 12)}${modality.name.length > 12 ? '...' : ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          
          <div class="chart-section" style="grid-column: span 4;">
            <h2 class="section-title">Processos Recentes</h2>
            
            <table class="process-table">
              <thead>
                <tr>
                  <th>PBDOC</th>
                  <th>Descrição</th>
                  <th>Modalidade</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                ${recentProcesses.map(process => `
                  <tr>
                    <td>${process.pbdocNumber}</td>
                    <td>${process.description}</td>
                    <td>${process.modality}</td>
                    <td>${process.responsible}</td>
                    <td><span class="status-badge ${process.statusClass}">${process.statusLabel}</span></td>
                    <td>${process.createdAt}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="chart-section" style="grid-column: span 4;">
            <h2 class="section-title">Fontes de Recursos</h2>
            
            <div class="two-columns">
              ${sourceData.map(source => `
                <div style="background-color: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                  <h3 style="margin-bottom: 0.5rem; color: #374151;">${source.name}</h3>
                  <p style="margin-bottom: 0.5rem; color: #6b7280; font-size: 14px;">${source.description}</p>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #3b82f6;">${source.count} processos</span>
                    <span style="color: #6b7280; font-size: 12px;">${Math.round((source.count / filteredProcesses.length) * 100)}% do total</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <footer class="footer">
          <p>SEAP-PB - Secretaria de Estado da Administração Penitenciária | Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
        </footer>
      </div>
    </body>
    </html>
    `;
    
    // Configurações para geração do PDF
    const options = {
      format: 'A4',
      landscape: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      preferCSSPageSize: true
    };
    
    // Conteúdo HTML para converter em PDF
    const file = { content: html };
    
    // Gerar o PDF
    htmlPdf.generatePdf(file, options).then(pdfBuffer => {
      // Criar um Blob com o buffer do PDF
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      
      // Criar uma URL para o Blob
      const url = URL.createObjectURL(blob);
      
      // Abrir o PDF em uma nova janela
      window.open(url);
    });
  } catch (error) {
    console.error('Erro ao gerar relatório PDF moderno:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}