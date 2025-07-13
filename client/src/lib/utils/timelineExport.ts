import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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
 * Gera um relatório PDF em formato de linha do tempo (timeline)
 */
export function generateTimelinePdfReport(data: ReportData): void {
  try {
    // Preparar dados
    const filteredProcesses = filterReportData(data);
    
    // Criar documento PDF com fundo escuro e orientação paisagem
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
    
    // == TÍTULO COM EFEITO DE SOMBRA ==
    doc.setFontSize(28);
    
    // Efeito de sombra (título principal) - texto ligeiramente translúcido em offset
    doc.setTextColor(220, 220, 220, 0.5);
    doc.text('Relatório Infográfico SEAP-PB', pageWidth / 2 + 1, 26, { align: 'center' });
    
    // Texto principal (título)
    doc.setTextColor(255, 255, 255);
    doc.text('Relatório Infográfico SEAP-PB', pageWidth / 2, 25, { align: 'center' });
    
    // === LINHA DO TEMPO CENTRAL ===
    const timelineY = 70;
    const timelineStartX = margin + 20;
    const timelineEndX = pageWidth - margin - 20;
    const timelineWidth = timelineEndX - timelineStartX;
    
    // Cores para a timeline (seguindo padrão do sistema)
    const timelineColors = [
      [245, 158, 11],  // Amarelo #F59E0B (Em Andamento)
      [16, 185, 129],  // Verde #10B981 (Concluído)
      [239, 68, 68],   // Vermelho #EF4444 (Atrasado)
      [156, 163, 175], // Cinza #9CA3AF (Cancelado)
      [59, 130, 246]   // Azul complementar
    ];
    
    // Dados para as estatísticas
    const statusCounts = {
      draft: filteredProcesses.filter(p => p.status === 'draft').length,
      in_progress: filteredProcesses.filter(p => p.status === 'in_progress').length,
      completed: filteredProcesses.filter(p => p.status === 'completed').length,
      canceled: filteredProcesses.filter(p => p.status === 'canceled').length,
    };
    
    // Estatísticas por modalidade
    const modalityStats = new Map<number, number>();
    filteredProcesses.forEach(p => {
      const count = modalityStats.get(p.modalityId) || 0;
      modalityStats.set(p.modalityId, count + 1);
    });
    const modalitiesData = Array.from(modalityStats.entries())
      .map(([id, count]) => {
        const modality = data.modalities.find(m => m.id === id);
        return { name: modality?.name || `Modalidade ${id}`, count };
      })
      .sort((a, b) => b.count - a.count);
    
    // Estatísticas por fonte
    const sourceStats = new Map<number, number>();
    filteredProcesses.forEach(p => {
      const count = sourceStats.get(p.sourceId) || 0;
      sourceStats.set(p.sourceId, count + 1);
    });
    const sourcesData = Array.from(sourceStats.entries())
      .map(([id, count]) => {
        const source = data.sources.find(s => s.id === id);
        return { name: source?.code || `Fonte ${id}`, count };
      })
      .sort((a, b) => b.count - a.count);
    
    // Estatísticas por responsável
    const responsibleStats = new Map<number, {total: number, completed: number}>();
    filteredProcesses.forEach(p => {
      const stats = responsibleStats.get(p.responsibleId) || {total: 0, completed: 0};
      stats.total++;
      if (p.status === 'completed') {
        stats.completed++;
      }
      responsibleStats.set(p.responsibleId, stats);
    });
    const responsiblesData = Array.from(responsibleStats.entries())
      .map(([id, stats]) => {
        const user = data.users.find(u => u.id === id);
        return { 
          name: user?.fullName || `Usuário ${id}`, 
          total: stats.total, 
          completed: stats.completed 
        };
      })
      .sort((a, b) => b.total - a.total);
    
    // Períodos da timeline com dados reais
    const periods = [
      { 
        label: 'Status', 
        year: 'Status', 
        color: timelineColors[0],
        stats: filteredProcesses.length,
        description: `Em Andamento: ${statusCounts.in_progress}\nConcluídos: ${statusCounts.completed}\nRascunho: ${statusCounts.draft}\nCancelados: ${statusCounts.canceled}`,
        chartData: [statusCounts.draft, statusCounts.in_progress, statusCounts.completed, statusCounts.canceled, 0]
      },
      { 
        label: 'Modalidades', 
        year: 'Modalidades', 
        color: timelineColors[1],
        stats: modalitiesData.reduce((sum, m) => sum + m.count, 0),
        description: modalitiesData.slice(0, 3).map(m => `${m.name}: ${m.count}`).join('\n'),
        chartData: modalitiesData.slice(0, 5).map(m => m.count)
      },
      { 
        label: 'Fontes', 
        year: 'Fontes', 
        color: timelineColors[2],
        stats: sourcesData.reduce((sum, s) => sum + s.count, 0),
        description: sourcesData.slice(0, 3).map(s => `${s.name}: ${s.count}`).join('\n'),
        chartData: sourcesData.slice(0, 5).map(s => s.count)
      },
      { 
        label: 'Responsáveis', 
        year: 'Resp.', 
        color: timelineColors[3],
        stats: responsiblesData.reduce((sum, r) => sum + r.total, 0),
        description: responsiblesData.slice(0, 3).map(r => `${r.name.split(' ')[0]}: ${r.total}`).join('\n'),
        chartData: responsiblesData.slice(0, 5).map(r => r.total)
      },
      { 
        label: 'Eficiência', 
        year: 'Desempenho', 
        color: timelineColors[4],
        stats: Math.round(responsiblesData.reduce((sum, r) => sum + r.completed, 0) / 
                Math.max(1, responsiblesData.reduce((sum, r) => sum + r.total, 0)) * 100),
        description: 'Porcentagem de processos\nconcluídos em relação\nao total de processos',
        chartData: [statusCounts.draft, statusCounts.in_progress, statusCounts.completed, statusCounts.canceled, filteredProcesses.length]
      }
    ];
    
    // Desenhar linha do tempo base (cinza)
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(8);
    doc.line(timelineStartX, timelineY, timelineEndX, timelineY);
    
    // Calcular largura de cada segmento
    const segmentWidth = timelineWidth / periods.length;
    
    // Desenhar os segmentos coloridos da timeline
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
      doc.text(period.description, x, descriptionY, { 
        align: 'center',
        maxWidth: segmentWidth - 20
      });
      
      // Círculo com gráfico de pizza/donut
      const circleRadius = 20;
      
      // Desenhar círculo principal
      doc.setFillColor(period.color[0], period.color[1], period.color[2]);
      doc.circle(x, circleY, circleRadius, 'F');
      
      // Segmentos decorativos no círculo (como na imagem de referência)
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
      
      // Círculo no centro com o mesmo fundo para criar efeito donut
      doc.setFillColor(60, 64, 75); // Mesma cor do fundo
      doc.circle(x, circleY, circleRadius * 0.5, 'F');
      
      // Texto com estatísticas
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`${period.stats || 0}`, x, circleY + 4, { align: 'center' });
    });
    
    // Rodapé com informações de geração
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`SEAP-PB | Sistema de Controle de Processos Licitatórios | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 
      pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Salvar o PDF
    doc.save(`timeline-processos-${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar relatório PDF:', error);
    alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
  }
}