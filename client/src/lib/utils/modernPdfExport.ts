// Usamos importações do lado do cliente para compatibilidade com o browser
import puppeteer from 'puppeteer-core/lib/cjs/puppeteer/web';
import { Process, User, BiddingModality, ResourceSource, Department } from "@shared/schema";

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
 * Prepara os dados para preencher o template HTML
 */
function prepareTemplateData(data: ReportData) {
  const filteredProcesses = filterReportData(data);
  
  // Status counts
  const statusCounts = {
    draft: filteredProcesses.filter(p => p.status === 'draft').length,
    in_progress: filteredProcesses.filter(p => p.status === 'in_progress').length,
    completed: filteredProcesses.filter(p => p.status === 'completed').length,
    canceled: filteredProcesses.filter(p => p.status === 'canceled').length,
  };
  
  // Modalidade counts
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
        count: count,
        height: 0, // será calculado depois
        color: ''
      };
    })
    .sort((a, b) => b.count - a.count);
  
  // Cores para gráficos
  const colors = [
    'var(--primary-light)',
    'var(--secondary)',
    'var(--accent)',
    'var(--success)',
    'var(--warning)'
  ];
  
  // Calcular altura relativa para barras
  const maxModalityCount = Math.max(...modalityData.map(m => m.count), 1);
  modalityData.forEach((item, index) => {
    item.height = (item.count / maxModalityCount) * 80;  // 80% da altura máxima
    item.color = colors[index % colors.length];
  });
  
  // Processos recentes formatados para tabela
  const recentProcesses = filteredProcesses
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(p => {
      const modality = data.modalities.find(m => m.id === p.modalityId);
      const responsible = data.users.find(u => u.id === p.responsibleId);
      
      let statusLabel = 'Desconhecido';
      let statusClass = '';
      
      switch(p.status) {
        case 'draft':
          statusLabel = 'Rascunho';
          statusClass = 'draft';
          break;
        case 'in_progress':
          statusLabel = 'Em Andamento';
          statusClass = 'in-progress';
          break;
        case 'completed':
          statusLabel = 'Concluído';
          statusClass = 'completed';
          break;
        case 'canceled':
          statusLabel = 'Cancelado';
          statusClass = 'canceled';
          break;
      }
      
      return {
        pbdocNumber: p.pbdocNumber,
        description: p.description.length > 50 ? p.description.substring(0, 50) + '...' : p.description,
        modality: modality?.name || 'N/A',
        responsible: responsible?.fullName || 'N/A',
        statusLabel,
        statusClass
      };
    });
  
  // Criar itens para a timeline
  const timelineItems = [
    {
      position: 'timeline-left',
      date: 'Estatísticas Gerais',
      title: 'Visão Geral',
      description: 'Resumo dos processos licitatórios do período selecionado.',
      stats: `Total: ${filteredProcesses.length} processos`
    },
    {
      position: 'timeline-right',
      date: 'Processos por Status',
      title: 'Distribuição de Status',
      description: `Análise da distribuição de status dos processos.`,
      stats: `Concluídos: ${statusCounts.completed} | Em Andamento: ${statusCounts.in_progress}`
    },
    {
      position: 'timeline-left',
      date: 'Modalidades',
      title: 'Principais Modalidades',
      description: 'As modalidades de licitação mais utilizadas neste período.',
      stats: modalityData.length > 0 ? `Mais comum: ${modalityData[0].name}` : 'Nenhuma modalidade'
    },
    {
      position: 'timeline-right',
      date: 'Conclusão',
      title: 'Eficiência do Processo',
      description: 'Análise de eficiência baseada na proporção de processos concluídos.',
      stats: `Taxa de conclusão: ${Math.round((statusCounts.completed / Math.max(filteredProcesses.length, 1)) * 100)}%`
    }
  ];
  
  // Departamento selecionado
  let selectedDepartment = 'Todos';
  if (data.filters.department && data.filters.department !== 'all' && data.departments) {
    const deptId = parseInt(data.filters.department);
    const dept = data.departments.find(d => d.id === deptId);
    if (dept) {
      selectedDepartment = dept.name;
    }
  }
  
  return {
    date: new Date().toLocaleDateString('pt-BR'),
    department: selectedDepartment,
    user: data.users[0]?.fullName || 'Usuário do Sistema',
    totalProcesses: filteredProcesses.length,
    completedProcesses: statusCounts.completed,
    inProgressProcesses: statusCounts.in_progress,
    draftProcesses: statusCounts.draft,
    canceledProcesses: statusCounts.canceled,
    modalityData,
    processes: recentProcesses,
    timelineItems
  };
}

/**
 * Gera HTML com os dados do relatório aplicados ao template
 */
function generateHTML(templatePath: string, data: any): string {
  let html = fs.readFileSync(templatePath, 'utf8');
  
  // Substituir variáveis simples
  const simpleVars = [
    'date', 'department', 'user', 'totalProcesses', 'completedProcesses', 
    'inProgressProcesses', 'draftProcesses', 'canceledProcesses'
  ];
  
  simpleVars.forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key].toString());
  });
  
  // Substituir arrays usando o formato #each
  function processEach(html: string, arrayName: string, array: any[]): string {
    const eachRegex = new RegExp(`{{#each ${arrayName}}}([\\s\\S]*?){{/each}}`, 'g');
    return html.replace(eachRegex, (match, template) => {
      return array.map(item => {
        let itemHTML = template;
        // Substituir propriedades do item
        Object.keys(item).forEach(key => {
          const propRegex = new RegExp(`{{this\\.${key}}}`, 'g');
          itemHTML = itemHTML.replace(propRegex, item[key].toString());
        });
        return itemHTML;
      }).join('');
    });
  }
  
  html = processEach(html, 'modalityData', data.modalityData);
  html = processEach(html, 'processes', data.processes);
  html = processEach(html, 'timelineItems', data.timelineItems);
  
  return html;
}

/**
 * Gera um relatório PDF moderno usando Puppeteer
 */
export async function generateModernPdfReport(data: ReportData): Promise<void> {
  try {
    const templateData = prepareTemplateData(data);
    
    // Caminho do template HTML
    const templatePath = path.resolve('./client/src/lib/utils/reportTemplate.html');
    
    // Gerar HTML com os dados aplicados
    const html = generateHTML(templatePath, templateData);
    
    // Lançar browser Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    
    const page = await browser.newPage();
    
    // Definir viewport para widescreen (1280px de largura)
    await page.setViewport({
      width: 1280,
      height: 1800,
      deviceScaleFactor: 1,
    });
    
    // Carregar o HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Gerar nome do arquivo
    const fileName = `relatorio-seap-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`;
    
    // Gerar PDF
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      path: fileName,
    });
    
    await browser.close();
    
    // Abrir o PDF no navegador
    const pdfUrl = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    window.open(pdfUrl);
    
    console.log(`PDF gerado com sucesso: ${fileName}`);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF moderno:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}